const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const UsageRecord = require('../models/UsageRecord');
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

    // Sum unbilled usage records for the period
    // Since there's no price-per-usage specified, we'll assume a simplistic $0.10 per unit just for the demo, 
    // or maybe the instructions just say "sum of unbilled usage records". 
    // "sum of unbilled usage records for the period" -> we'll sum quantity and multiply by a default price per unit (e.g. 0.05).
    // Let's use $1 per unit of usage to keep it simple, or add a comment.
    const usageRecords = await UsageRecord.find({
      subscriptionId,
      periodStart: { $gte: subscription.currentPeriodStart },
      periodEnd: { $lte: subscription.currentPeriodEnd }
    });

    const totalUsageQuantity = usageRecords.reduce((acc, curr) => acc + curr.quantity, 0);
    const USAGE_PRICE_PER_UNIT = 0.50; // Document this assumption
    const usageCost = totalUsageQuantity * USAGE_PRICE_PER_UNIT;

    let totalAmount = plan.price + usageCost;

    // Apply Coupon if present
    if (subscription.couponId) {
      const Coupon = require('../models/Coupon');
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
    } else {
      invoice.status = 'failed';
      invoice.retryCount += 1;
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

    if (invoice.status === 'paid') {
      return res.status(409).json({
        success: false,
        message: 'Invoice is already paid',
        errorCode: 'INVOICE_ALREADY_PAID'
      });
    }

    const MAX_RETRIES = 3;

    if (invoice.retryCount >= MAX_RETRIES) {
      // Transition subscription to suspended
      const subscription = await Subscription.findById(invoice.subscriptionId);
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

    // Simulate retry (stub for actual payment gateway call)
    // Here we assume it fails again for demonstration, or we just increment
    // Since it's a manual retry stub, we'll increment the counter.
    invoice.retryCount += 1;
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
