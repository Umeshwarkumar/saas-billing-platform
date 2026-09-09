const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

const getRevenueReport = async (req, res, next) => {
  try {
    // We assume the reporting period is the current month.
    const now = new Date();
    const startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Compute MRR (Monthly Recurring Revenue)
    // Formula: Sum of (plan.price) for all active monthly subscriptions
    //          + Sum of (plan.price / 12) for all active yearly subscriptions.
    const activeSubscriptions = await Subscription.find({ status: 'active' });
    let mrr = 0;

    for (const sub of activeSubscriptions) {
      const plan = await Plan.findById(sub.planId);
      if (plan) {
        if (plan.billingCycle === 'monthly') {
          mrr += plan.price;
        } else if (plan.billingCycle === 'yearly') {
          mrr += (plan.price / 12);
        }
      }
    }

    // 2. Compute Churn Rate
    // Formula: (Cancelled subscriptions within the period) / (Active subscriptions at the START of the period).
    // Active at start of period = subscriptions created BEFORE startOfPeriod AND 
    //   (status is still active OR cancelledAt is AFTER startOfPeriod).
    // Cancelled in period = cancelledAt >= startOfPeriod AND cancelledAt <= endOfPeriod.

    const activeAtStart = await Subscription.countDocuments({
      createdAt: { $lt: startOfPeriod },
      $or: [
        { status: 'active' },
        { cancelledAt: { $gte: startOfPeriod } }
      ]
    });

    const cancelledInPeriod = await Subscription.countDocuments({
      status: 'cancelled',
      cancelledAt: { $gte: startOfPeriod, $lte: endOfPeriod }
    });

    let churnRate = 0;
    if (activeAtStart > 0) {
      churnRate = (cancelledInPeriod / activeAtStart) * 100; // as a percentage
    }

    return res.status(200).json({
      success: true,
      message: 'Revenue report generated successfully',
      data: {
        reportingPeriod: {
          start: startOfPeriod,
          end: endOfPeriod
        },
        mrr: Math.round(mrr * 100) / 100, // rounded to 2 decimals
        churnRate: Math.round(churnRate * 100) / 100,
        metrics: {
          activeAtStart,
          cancelledInPeriod
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRevenueReport
};
