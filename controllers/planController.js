const Plan = require('../models/Plan');
const { validationResult } = require('express-validator');

const createPlan = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { name, price, billingCycle, featureLimits, isActive } = req.body;

    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res.status(409).json({
        success: false,
        message: 'Plan name already exists',
        errorCode: 'DUPLICATE_PLAN'
      });
    }

    const newPlan = await Plan.create({
      name,
      price,
      billingCycle,
      featureLimits,
      isActive
    });

    return res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: newPlan
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Plan name already exists',
        errorCode: 'DUPLICATE_PLAN'
      });
    }
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    if (updateData.name) {
      const existingPlan = await Plan.findOne({ name: updateData.name, _id: { $ne: id } });
      if (existingPlan) {
        return res.status(409).json({
          success: false,
          message: 'Plan name already exists',
          errorCode: 'DUPLICATE_PLAN'
        });
      }
    }

    const updatedPlan = await Plan.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    
    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
        errorCode: 'PLAN_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: updatedPlan
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Plan name already exists',
        errorCode: 'DUPLICATE_PLAN'
      });
    }
    next(error);
  }
};

const getPlans = async (req, res, next) => {
  try {
    let query = {};
    
    // Customers can only see active plans, Billing Admins can see all.
    if (req.user.role === 'Customer') {
      query.isActive = true;
    }

    const plans = await Plan.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Plans retrieved successfully',
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPlan,
  updatePlan,
  getPlans
};
