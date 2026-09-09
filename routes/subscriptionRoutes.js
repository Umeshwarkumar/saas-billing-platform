const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate, authorize } = require('../middleware/auth');
const { createSubscriptionRules, changePlanRules } = require('../validators/subscriptionValidator');

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

module.exports = router;
