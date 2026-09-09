const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const Coupon = require('../models/Coupon');
const { validationResult } = require('express-validator');

const createSubscription = async (req, res, next) => {
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

    const customerId = req.user.userId;
    const { planId } = req.body;

    // Check if customer already has an active subscription
    const existingSub = await Subscription.findOne({ customerId, status: 'active' });
    if (existingSub) {
      return res.status(409).json({
        success: false,
        message: 'Customer already has an active subscription',
        errorCode: 'ACTIVE_SUBSCRIPTION_EXISTS'
      });
    }

    // Verify plan exists and is active
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Plan does not exist or is inactive',
        errorCode: 'INVALID_PLAN'
      });
    }

    // Calculate dates
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(currentPeriodStart);
    
    if (plan.billingCycle === 'monthly') {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else if (plan.billingCycle === 'yearly') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    }

    const newSub = await Subscription.create({
      customerId,
      planId,
      status: 'active',
      currentPeriodStart,
      currentPeriodEnd
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: newSub
    });
  } catch (error) {
    next(error);
  }
};

const changePlan = async (req, res, next) => {
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
    const { planId: targetPlanId } = req.body;
    const customerId = req.user.userId;

    // Find subscription
    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        errorCode: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Verify ownership
    if (subscription.customerId.toString() !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify your own subscription',
        errorCode: 'FORBIDDEN_OWNERSHIP'
      });
    }

    // Check same plan
    if (subscription.planId.toString() === targetPlanId) {
      return res.status(400).json({
        success: false,
        message: 'Already subscribed to this plan',
        errorCode: 'SAME_PLAN'
      });
    }

    // Verify target plan
    const targetPlan = await Plan.findById(targetPlanId);
    if (!targetPlan || !targetPlan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Target plan does not exist or is inactive',
        errorCode: 'INVALID_TARGET_PLAN'
      });
    }

    // Get current plan for proration calculations
    const currentPlan = await Plan.findById(subscription.planId);
    if (!currentPlan) {
        return res.status(500).json({
            success: false,
            message: 'Original plan data missing, cannot compute proration',
            errorCode: 'INTERNAL_ERROR'
        });
    }

    // Proration Logic
    // Proration is calculated proportionally for the remaining days in the cycle.
    const now = new Date();
    
    let prorationNote = '';
    // Only calculate proration if we are still within the current period
    if (now >= subscription.currentPeriodStart && now < subscription.currentPeriodEnd) {
      const totalPeriodMs = subscription.currentPeriodEnd.getTime() - subscription.currentPeriodStart.getTime();
      const remainingMs = subscription.currentPeriodEnd.getTime() - now.getTime();
      
      const ratio = remainingMs / totalPeriodMs;
      const unusedCurrentPlanValue = currentPlan.price * ratio;
      const remainingTargetPlanValue = targetPlan.price * ratio;
      
      const priceDifference = remainingTargetPlanValue - unusedCurrentPlanValue;
      const roundedDiff = Math.round(priceDifference * 100) / 100;
      
      const action = roundedDiff >= 0 ? 'charged' : 'credited';
      const absDiff = Math.abs(roundedDiff);

      prorationNote = `Changed from ${currentPlan.name} ($${currentPlan.price}) to ${targetPlan.name} ($${targetPlan.price}) on ${now.toISOString()}. ` +
                      `Ratio remaining: ${(ratio * 100).toFixed(2)}%. ` +
                      `Application-level simulated proration adjustment: $${absDiff} will be ${action} on the next invoice cycle.`;
    } else {
        prorationNote = `Changed from ${currentPlan.name} to ${targetPlan.name} outside normal cycle on ${now.toISOString()}. No proration applied.`;
    }

    // Update subscription
    subscription.planId = targetPlanId;
    subscription.prorationNotes.push(prorationNote);
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Plan changed successfully',
      data: subscription
    });
  } catch (error) {
    next(error);
  }
};

const cancelSubscription = async (req, res, next) => {
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
    const customerId = req.user.userId;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        errorCode: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Admins can cancel any, Customer can only cancel own
    if (req.user.role === 'Customer' && subscription.customerId.toString() !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own subscription',
        errorCode: 'FORBIDDEN_OWNERSHIP'
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Subscription is already cancelled',
        errorCode: 'ALREADY_CANCELLED'
      });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully. Access remains valid until current period ends.',
      data: subscription
    });
  } catch (error) {
    next(error);
  }
};

const applyCoupon = async (req, res, next) => {
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
    const { code } = req.body;
    const customerId = req.user.userId;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        errorCode: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Ownership check
    if (req.user.role === 'Customer' && subscription.customerId.toString() !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only manage your own subscription',
        errorCode: 'FORBIDDEN_OWNERSHIP'
      });
    }

    if (subscription.couponId) {
      return res.status(409).json({
        success: false,
        message: 'A coupon is already applied to this subscription',
        errorCode: 'COUPON_ALREADY_APPLIED'
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
        errorCode: 'COUPON_NOT_FOUND'
      });
    }

    if (!coupon.active || new Date() > coupon.expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is expired or inactive',
        errorCode: 'COUPON_INVALID'
      });
    }

    subscription.couponId = coupon._id;
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: subscription
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubscription,
  changePlan,
  cancelSubscription,
  applyCoupon
};
