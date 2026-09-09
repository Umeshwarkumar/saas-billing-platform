const UsageRecord = require('../models/UsageRecord');
const Subscription = require('../models/Subscription');
const { validationResult } = require('express-validator');

const logUsage = async (req, res, next) => {
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

    const { subscriptionId, metric, quantity, periodStart, periodEnd } = req.body;

    // Check if subscription exists
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        errorCode: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Check status
    if (subscription.status !== 'active') {
      return res.status(409).json({
        success: false,
        message: 'Subscription is not active',
        errorCode: 'SUBSCRIPTION_NOT_ACTIVE'
      });
    }

    const record = await UsageRecord.create({
      subscriptionId,
      metric,
      quantity,
      periodStart,
      periodEnd
    });

    return res.status(201).json({
      success: true,
      message: 'Usage logged successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const getUsage = async (req, res, next) => {
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

    const { subscriptionId } = req.params;

    // Check subscription exists
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        errorCode: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Ownership check: Admin can view any, Customer can only view their own
    if (req.user.role === 'Customer' && subscription.customerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this subscription.',
        errorCode: 'FORBIDDEN'
      });
    }

    const records = await UsageRecord.find({ subscriptionId }).sort({ periodStart: -1 });

    return res.status(200).json({
      success: true,
      message: 'Usage records retrieved successfully',
      data: records
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logUsage,
  getUsage
};
