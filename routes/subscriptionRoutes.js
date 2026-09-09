const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate, authorize } = require('../middleware/auth');
const { createSubscriptionRules, changePlanRules, cancelSubscriptionRules, applyCouponRules } = require('../validators/subscriptionValidator');

// Subscriptions are created and managed by Customers
router.post(
  '/',
  authenticate,
  authorize('Customer'),
  createSubscriptionRules(),
  subscriptionController.createSubscription
);

router.put(
  '/:id/change-plan',
  authenticate,
  authorize('Customer'),
  changePlanRules(),
  subscriptionController.changePlan
);

router.put(
  '/:id/cancel',
  authenticate,
  // Allowed for both Customer and Admin. Access control logic in controller.
  cancelSubscriptionRules(),
  subscriptionController.cancelSubscription
);

router.post(
  '/:id/apply-coupon',
  authenticate,
  authorize('Customer'),
  applyCouponRules(),
  subscriptionController.applyCoupon
);

module.exports = router;
