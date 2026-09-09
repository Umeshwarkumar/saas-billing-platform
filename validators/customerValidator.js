const { param } = require('express-validator');

const dashboardRules = () => {
  return [
    param('id').isMongoId().withMessage('Invalid Customer ID')
  ];
};

module.exports = {
  dashboardRules
};
