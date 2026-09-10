const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function runSprint2Tests() {
  let mongoServer;
  try {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const app = require('../server');

    const User = require('../models/User');
    const Plan = require('../models/Plan');
    const Subscription = require('../models/Subscription');
    const UsageRecord = require('../models/UsageRecord');
    const Invoice = require('../models/Invoice');
    const { generateToken } = require('../utils/auth');

    console.log('==============================================');
    console.log('  RUNNING SPRINT 2 INTEGRATION TESTS');
    console.log('==============================================\n');

    // 1. Setup Test Users and Plan
    const admin = await User.create({ name: 'Billing Admin', email: 'admin@test.com', passwordHash: 'hash', role: 'Billing Admin' });
    const cust1 = await User.create({ name: 'Customer One', email: 'cust1@test.com', passwordHash: 'hash', role: 'Customer' });
    const cust2 = await User.create({ name: 'Customer Two', email: 'cust2@test.com', passwordHash: 'hash', role: 'Customer' });

    const adminToken = generateToken(admin._id, admin.role);
    const cust1Token = generateToken(cust1._id, cust1.role);
    const cust2Token = generateToken(cust2._id, cust2.role);

    const plan = await Plan.create({ name: 'Pro Plan', price: 100, billingCycle: 'monthly' });

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sub1 = await Subscription.create({
      customerId: cust1._id,
      planId: plan._id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd
    });

    const sub2 = await Subscription.create({
      customerId: cust2._id,
      planId: plan._id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd
    });

    let passes = 0;
    let fails = 0;

    function assertTest(name, condition, details = '') {
      if (condition) {
        console.log(`  [PASS] ${name}`);
        passes++;
      } else {
        console.error(`  [FAIL] ${name} ${details}`);
        fails++;
      }
    }

    // ==============================================
    // 1. USAGE METERING TESTS
    // ==============================================
    console.log('--- 1. Usage Metering Records ---');

    // Test 1.1: Successful usage creation
    let res = await request(app)
      .post('/api/usage')
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({
        subscriptionId: sub1._id,
        metric: 'api_calls',
        quantity: 20,
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString()
      });
    assertTest('Successful usage creation (201)', res.status === 201 && res.body.success === true, JSON.stringify(res.body));

    // Test 1.2: Invalid quantity (negative)
    res = await request(app)
      .post('/api/usage')
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({
        subscriptionId: sub1._id,
        metric: 'api_calls',
        quantity: -5,
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString()
      });
    assertTest('Invalid negative quantity rejected (400)', res.status === 400 && res.body.errorCode === 'VALIDATION_ERROR');

    // Test 1.3: Nonexistent subscription
    const fakeId = new mongoose.Types.ObjectId();
    res = await request(app)
      .post('/api/usage')
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({
        subscriptionId: fakeId,
        metric: 'api_calls',
        quantity: 10,
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString()
      });
    assertTest('Nonexistent subscription handling (404)', res.status === 404 && res.body.errorCode === 'SUBSCRIPTION_NOT_FOUND');

    // Test 1.4: Unauthorized customer trying to log usage for another customer's sub
    res = await request(app)
      .post('/api/usage')
      .set('Authorization', `Bearer ${cust2Token}`)
      .send({
        subscriptionId: sub1._id,
        metric: 'api_calls',
        quantity: 10,
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString()
      });
    assertTest('Unauthorized usage logging rejected (403)', res.status === 403 && res.body.errorCode === 'FORBIDDEN');

    // Test 1.5: GET usage records for subscription
    res = await request(app)
      .get(`/api/usage/${sub1._id}`)
      .set('Authorization', `Bearer ${cust1Token}`);
    assertTest('GET usage records (200)', res.status === 200 && Array.isArray(res.body.data) && res.body.data.length === 1);

    // ==============================================
    // 2. INVOICE GENERATION ENGINE TESTS
    // ==============================================
    console.log('\n--- 2. Invoice Generation Engine ---');

    // Test 2.1: Successful invoice generation (Base 100 + Usage 20 * 0.50 = 110)
    res = await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subscriptionId: sub1._id });
    assertTest('Successful invoice generation (201)', res.status === 201 && res.body.data.amount === 110 && res.body.data.status === 'pending');
    const invoice1Id = res.body.data ? res.body.data._id : null;

    // Test 2.2: Duplicate invoice prevention for same billing period
    res = await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subscriptionId: sub1._id });
    assertTest('Duplicate invoice prevention (409)', res.status === 409 && res.body.errorCode === 'DUPLICATE_INVOICE');

    // Test 2.3: Nonexistent subscription invoice generation
    res = await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subscriptionId: fakeId });
    assertTest('Nonexistent subscription invoice generation (404)', res.status === 404 && res.body.errorCode === 'SUBSCRIPTION_NOT_FOUND');

    // ==============================================
    // 3. PAYMENT STATUS TRACKING & RETRY TESTS
    // ==============================================
    console.log('\n--- 3. Payment Status Tracking & Retry ---');

    // Generate invoice for sub2 to test payment failure & retries
    res = await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subscriptionId: sub2._id });
    const invoice2Id = res.body.data._id;

    // Test 3.1: Successful payment on invoice 1
    res = await request(app)
      .put(`/api/invoices/${invoice1Id}/pay`)
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({ success: true });
    assertTest('Successful payment execution (200)', res.status === 200 && res.body.data.status === 'paid' && res.body.data.paidAt !== null);

    // Test 3.2: Re-paying an already paid invoice
    res = await request(app)
      .put(`/api/invoices/${invoice1Id}/pay`)
      .set('Authorization', `Bearer ${cust1Token}`)
      .send({ success: true });
    assertTest('Already-paid invoice rejection (409)', res.status === 409 && res.body.errorCode === 'INVOICE_ALREADY_PAID');

    // Test 3.3: Payment failure on invoice 2
    res = await request(app)
      .put(`/api/invoices/${invoice2Id}/pay`)
      .set('Authorization', `Bearer ${cust2Token}`)
      .send({ success: false });
    assertTest('Failed payment recorded (200)', res.status === 200 && res.body.data.status === 'failed' && res.body.data.retryCount === 1);

    // Test 3.4: Payment retry 2
    res = await request(app)
      .post(`/api/invoices/${invoice2Id}/retry`)
      .set('Authorization', `Bearer ${cust2Token}`)
      .send({ success: false });
    assertTest('Payment retry incremented (200)', res.status === 200 && res.body.data.retryCount === 2);

    // Test 3.5: Payment retry 3 (reaches max retries)
    res = await request(app)
      .post(`/api/invoices/${invoice2Id}/retry`)
      .set('Authorization', `Bearer ${cust2Token}`)
      .send({ success: false });
    assertTest('Payment retry 3 completed (200)', res.status === 200 && res.body.data.retryCount === 3);

    // Test 3.6: Payment retry exceeding max retries -> Subscription suspended
    res = await request(app)
      .post(`/api/invoices/${invoice2Id}/retry`)
      .set('Authorization', `Bearer ${cust2Token}`)
      .send({ success: false });
    assertTest('Exceeded max retries triggers subscription suspension (409)', res.status === 409 && res.body.errorCode === 'MAX_RETRIES_EXCEEDED');

    const updatedSub2 = await Subscription.findById(sub2._id);
    assertTest('Subscription status updated to suspended', updatedSub2.status === 'suspended');

    // ==============================================
    // 4. SUBSCRIPTION CANCELLATION & GRACE PERIOD TESTS
    // ==============================================
    console.log('\n--- 4. Subscription Cancellation & Grace Period ---');

    // Test 4.1: Unauthorized cancellation attempt (cust2 trying to cancel sub1)
    res = await request(app)
      .put(`/api/subscriptions/${sub1._id}/cancel`)
      .set('Authorization', `Bearer ${cust2Token}`);
    assertTest('Unauthorized cancellation rejected (403)', res.status === 403 && res.body.errorCode === 'FORBIDDEN_OWNERSHIP');

    // Test 4.2: Successful cancellation by customer owner
    res = await request(app)
      .put(`/api/subscriptions/${sub1._id}/cancel`)
      .set('Authorization', `Bearer ${cust1Token}`);
    assertTest('Successful cancellation (200)', res.status === 200 && res.body.data.status === 'cancelled' && res.body.data.cancelledAt !== null);

    // Test 4.3: Grace period preservation (currentPeriodEnd preserved)
    const cancelledSub = res.body.data;
    assertTest('Grace period retained until currentPeriodEnd', cancelledSub.currentPeriodEnd !== null);

    // Test 4.4: Repeated cancellation attempt on already cancelled sub
    res = await request(app)
      .put(`/api/subscriptions/${sub1._id}/cancel`)
      .set('Authorization', `Bearer ${cust1Token}`);
    assertTest('Repeated cancellation rejected (409)', res.status === 409 && res.body.errorCode === 'ALREADY_CANCELLED');

    console.log('\n==============================================');
    console.log(`  SUMMARY: ${passes} PASSED, ${fails} FAILED`);
    console.log('==============================================\n');

    await mongoose.connection.close();
    await mongoServer.stop();

    if (fails > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    if (mongoServer) await mongoServer.stop();
    process.exit(1);
  }
}

runSprint2Tests();
