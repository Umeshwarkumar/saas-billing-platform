const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    billingCycle: {
      type: String,
      required: true,
      enum: ['monthly', 'yearly']
    },
    featureLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);


module.exports = mongoose.model('Plan', planSchema, 'plans');
