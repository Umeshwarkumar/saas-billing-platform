const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ['active'],
      default: 'active'
    },
    currentPeriodStart: {
      type: Date,
      required: true
    },
    currentPeriodEnd: {
      type: Date,
      required: true
    },
    prorationNotes: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: true
  }
);

subscriptionSchema.index({ customerId: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema, 'subscriptions');
