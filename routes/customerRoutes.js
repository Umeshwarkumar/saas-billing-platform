const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');
const { dashboardRules } = require('../validators/customerValidator');

router.get(
  '/:id/dashboard',
  authenticate,
  dashboardRules(),
  customerController.getDashboard
);

module.exports = router;
