const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    paidAt: {
      type: Date,
      default: null
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying by subscription
invoiceSchema.index({ subscriptionId: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema, 'invoices');
