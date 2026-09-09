const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    type: {
      type: String,
      required: true,
      enum: ['percentage', 'flat']
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    expiryDate: {
      type: Date,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Coupon', couponSchema, 'coupons');
