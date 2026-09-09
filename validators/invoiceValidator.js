const { body, param } = require('express-validator');

const generateInvoiceRules = () => {
  return [
    body('subscriptionId').isMongoId().withMessage('Invalid Subscription ID')
  ];
};

const payInvoiceRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Invoice ID'),
    body('success').isBoolean().withMessage('Success flag must be a boolean')
  ];
};

const retryInvoiceRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Invoice ID')
  ];
};

module.exports = {
  generateInvoiceRules,
  payInvoiceRules,
  retryInvoiceRules
};
