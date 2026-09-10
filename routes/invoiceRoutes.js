const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/auth');
const { generateInvoiceRules, payInvoiceRules, retryInvoiceRules } = require('../validators/invoiceValidator');

// Generate invoice (Billing Admin or Customer for own sub)
router.post(
  '/generate',
  authenticate,
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
  retryInvoiceRules(),
  invoiceController.retryInvoice
);

module.exports = router;

