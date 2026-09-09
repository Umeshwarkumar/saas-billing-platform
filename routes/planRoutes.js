const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { authenticate, authorize } = require('../middleware/auth');
const { createPlanRules, updatePlanRules } = require('../validators/planValidator');

// Public route to get plans? Requirements say "Authenticated users can view active plans."
// We'll protect it.
router.get('/', authenticate, planController.getPlans);

// Billing Admin only routes
router.post(
  '/',
  authenticate,
  authorize('Billing Admin'),
  createPlanRules(),
  planController.createPlan
);

router.put(
  '/:id',
  authenticate,
  authorize('Billing Admin'),
  updatePlanRules(),
  planController.updatePlan
);

module.exports = router;
