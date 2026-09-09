const { body, param } = require('express-validator');

const createSubscriptionRules = () => {
  return [
    body('planId').isMongoId().withMessage('Invalid Plan ID')
  ];
};

const changePlanRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Subscription ID'),
    body('planId').isMongoId().withMessage('Invalid Target Plan ID')
  ];
};

const cancelSubscriptionRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Subscription ID')
  ];
};

const applyCouponRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Subscription ID'),
    body('code').trim().notEmpty().withMessage('Coupon code is required')
  ];
};

module.exports = {
  createSubscriptionRules,
  changePlanRules,
  cancelSubscriptionRules,
  applyCouponRules
};
