const { body, param } = require('express-validator');

const logUsageRules = () => {
  return [
    body('subscriptionId').isMongoId().withMessage('Invalid Subscription ID'),
    body('metric').trim().notEmpty().withMessage('Metric is required'),
    body('quantity').isNumeric().withMessage('Quantity must be a number').custom(val => val >= 0).withMessage('Quantity cannot be negative'),
    body('periodStart').isISO8601().toDate().withMessage('Valid periodStart date is required'),
    body('periodEnd').isISO8601().toDate().withMessage('Valid periodEnd date is required')
  ];
};

const getUsageRules = () => {
  return [
    param('subscriptionId').isMongoId().withMessage('Invalid Subscription ID')
  ];
};

module.exports = {
  logUsageRules,
  getUsageRules
};
