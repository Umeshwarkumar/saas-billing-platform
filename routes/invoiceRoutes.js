const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');
const { generateInvoiceRules, payInvoiceRules, retryInvoiceRules } = require('../validators/invoiceValidator');

// Billing Admin triggers invoice generation (or a cron job)
router.post(
  '/generate',
  authenticate,
  authorize('Billing Admin'),
  generateInvoiceRules(),
  invoiceController.generateInvoice
);

router.put(
  '/:id/pay',
  authenticate,
  payInvoiceRules(),
  invoiceController.payInvoice
);

router.post(
  '/:id/retry',
  authenticate,
  authorize('Billing Admin'),
  retryInvoiceRules(),
  invoiceController.retryInvoice
);

module.exports = router;
