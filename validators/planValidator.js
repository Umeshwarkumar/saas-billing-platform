const { body, param } = require('express-validator');

const createPlanRules = () => {
  return [
    body('name').trim().notEmpty().withMessage('Plan name is required'),
    body('price').isNumeric().withMessage('Price must be a number').custom(value => value >= 0).withMessage('Price cannot be negative'),
    body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Billing cycle must be monthly or yearly'),
    body('featureLimits').optional().isObject().withMessage('Feature limits must be an object'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ];
};

const updatePlanRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Plan ID'),
    body('name').optional().trim().notEmpty().withMessage('Plan name cannot be empty'),
    body('price').optional().isNumeric().withMessage('Price must be a number').custom(value => value >= 0).withMessage('Price cannot be negative'),
    body('billingCycle').optional().isIn(['monthly', 'yearly']).withMessage('Billing cycle must be monthly or yearly'),
    body('featureLimits').optional().isObject().withMessage('Feature limits must be an object'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ];
};

module.exports = {
  createPlanRules,
  updatePlanRules
};
