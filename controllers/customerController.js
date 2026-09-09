const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const UsageRecord = require('../models/UsageRecord');
const Invoice = require('../models/Invoice');
const { validationResult } = require('express-validator');

const getDashboard = async (req, res, next) => {
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

    // Enforce ownership
    if (req.user.role === 'Customer' && req.user.userId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only view your own dashboard.',
        errorCode: 'FORBIDDEN_OWNERSHIP'
      });
    }

    const subscription = await Subscription.findOne({ customerId: id }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found for this customer',
        errorCode: 'NO_SUBSCRIPTION'
      });
    }

    const plan = await Plan.findById(subscription.planId);
    
    // Usage summary for current period
    const usageRecords = await UsageRecord.find({
      subscriptionId: subscription._id,
      periodStart: { $gte: subscription.currentPeriodStart },
      periodEnd: { $lte: subscription.currentPeriodEnd }
    });

    const totalUsage = usageRecords.reduce((sum, record) => sum + record.quantity, 0);

    // Invoice history
    const invoices = await Invoice.find({ subscriptionId: subscription._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        subscription: {
          id: subscription._id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          couponId: subscription.couponId
        },
        plan: plan ? {
          id: plan._id,
          name: plan.name,
          price: plan.price,
          billingCycle: plan.billingCycle
        } : null,
        usage: {
          totalCurrentPeriodQuantity: totalUsage,
          recordsCount: usageRecords.length
        },
        invoices
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard
};
