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

module.exports = {
  createSubscriptionRules,
  changePlanRules
};
