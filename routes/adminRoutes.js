const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get(
  '/reports/revenue',
  authenticate,
  authorize('Billing Admin'),
  adminController.getRevenueReport
);

module.exports = router;
