const mongoose = require('mongoose');

const usageRecordSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true
    },
    metric: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying by subscription
usageRecordSchema.index({ subscriptionId: 1 });

module.exports = mongoose.model('UsageRecord', usageRecordSchema, 'usageRecords');
