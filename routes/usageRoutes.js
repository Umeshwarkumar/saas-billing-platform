const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');
const { authenticate } = require('../middleware/auth');
const { logUsageRules, getUsageRules } = require('../validators/usageValidator');

// Both roles might log usage (or an automated system, but here we just authenticate)
router.post(
  '/',
  authenticate,
  logUsageRules(),
  usageController.logUsage
);

router.get(
  '/:subscriptionId',
  authenticate,
  getUsageRules(),
  usageController.getUsage
);

module.exports = router;
