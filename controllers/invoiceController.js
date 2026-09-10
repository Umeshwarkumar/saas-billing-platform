const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const UsageRecord = require('../models/UsageRecord');
const Coupon = require('../models/Coupon');
const { validationResult } = require('express-validator');

const generateInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { subscriptionId } = req.body;

    // Check subscription exists
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        errorCode: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Ownership check: Billing Admin can generate any, Customer can generate for own subscription
    if (req.user.role === 'Customer' && subscription.customerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this subscription.',
        errorCode: 'FORBIDDEN'
      });
    }

    // Prevent duplicate invoice for the same subscription + period
    const existingInvoice = await Invoice.findOne({
      subscriptionId,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd
    });

    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        message: 'Invoice already generated for the current billing period',
        errorCode: 'DUPLICATE_INVOICE'
      });
    }

    // Fetch Plan to get base price
    const plan = await Plan.findById(subscription.planId);
    if (!plan) {
      return res.status(500).json({
        success: false,
        message: 'Associated plan not found',
        errorCode: 'INTERNAL_ERROR'
      });
    }

    // Sum usage records for the period
    const usageRecords = await UsageRecord.find({
      subscriptionId,
      periodStart: { $gte: subscription.currentPeriodStart, $lte: subscription.currentPeriodEnd }
    });

    const totalUsageQuantity = usageRecords.reduce((acc, curr) => acc + curr.quantity, 0);
    const USAGE_PRICE_PER_UNIT = 0.50; // Preserved project assumption
    const usageCost = totalUsageQuantity * USAGE_PRICE_PER_UNIT;

    let totalAmount = plan.price + usageCost;

    // Apply Coupon if present
    if (subscription.couponId) {
      const coupon = await Coupon.findById(subscription.couponId);
      if (coupon && coupon.active && new Date() <= coupon.expiryDate) {
        if (coupon.type === 'percentage') {
          totalAmount = totalAmount - (totalAmount * (coupon.value / 100));
        } else if (coupon.type === 'flat') {
          totalAmount = totalAmount - coupon.value;
        }
        if (totalAmount < 0) totalAmount = 0;
      }
    }

    // Set Due Date = periodEnd + 7 days grace period
    const GRACE_PERIOD_DAYS = 7;
    const dueDate = new Date(subscription.currentPeriodEnd);
    dueDate.setDate(dueDate.getDate() + GRACE_PERIOD_DAYS);

    const invoice = await Invoice.create({
      subscriptionId,
      amount: totalAmount,
      status: 'pending',
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      dueDate
    });

    return res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

const payInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { success } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
        errorCode: 'INVOICE_NOT_FOUND'
      });
    }

    // Ownership check
    const subscription = await Subscription.findById(invoice.subscriptionId);
    if (req.user.role === 'Customer' && subscription && subscription.customerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this invoice.',
        errorCode: 'FORBIDDEN'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(409).json({
        success: false,
        message: 'Invoice is already paid',
        errorCode: 'INVOICE_ALREADY_PAID'
      });
    }

    if (success) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();

      // If subscription was past_due, reactivate it
      if (subscription && subscription.status === 'past_due') {
        subscription.status = 'active';
        await subscription.save();
      }
    } else {
      invoice.status = 'failed';
      invoice.retryCount += 1;

      if (invoice.retryCount >= 3 && subscription && subscription.status !== 'suspended') {
        subscription.status = 'suspended';
        await subscription.save();
      }
    }

    await invoice.save();

    return res.status(200).json({
      success: true,
      message: success ? 'Invoice paid successfully' : 'Invoice payment failed',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

const retryInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
        errorCode: 'INVOICE_NOT_FOUND'
      });
    }

    // Ownership check
    const subscription = await Subscription.findById(invoice.subscriptionId);
    if (req.user.role === 'Customer' && subscription && subscription.customerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this invoice.',
        errorCode: 'FORBIDDEN'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(409).json({
        success: false,
        message: 'Invoice is already paid',
        errorCode: 'INVOICE_ALREADY_PAID'
      });
    }

    const MAX_RETRIES = 3;

    if (invoice.retryCount >= MAX_RETRIES) {
      if (subscription && subscription.status !== 'suspended') {
        subscription.status = 'suspended';
        await subscription.save();
      }

      return res.status(409).json({
        success: false,
        message: 'Max retry limit reached. Subscription is now suspended.',
        errorCode: 'MAX_RETRIES_EXCEEDED'
      });
    }

    // Execute retry attempt
    invoice.retryCount += 1;

    const retrySuccessful = req.body && req.body.success === true;
    if (retrySuccessful) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      if (subscription && subscription.status === 'past_due') {
        subscription.status = 'active';
        await subscription.save();
      }
    } else {
      invoice.status = 'failed';
      if (invoice.retryCount >= MAX_RETRIES && subscription && subscription.status !== 'suspended') {
        subscription.status = 'suspended';
        await subscription.save();
      }
    }

    await invoice.save();

    return res.status(200).json({
      success: true,
      message: `Retry ${invoice.retryCount}/${MAX_RETRIES} completed.`,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateInvoice,
  payInvoice,
  retryInvoice
};

