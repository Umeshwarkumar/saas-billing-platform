const request = require('supertest');
const mongoose = require('mongoose');

async function runAll() {
  process.env.NODE_ENV = 'test';
  const app = require('../server');

  // wait a bit for DB to connect (lazy way)
  await new Promise(r => setTimeout(r, 2000));

  const User = require('../models/User');
  const Plan = require('../models/Plan');
  const Subscription = require('../models/Subscription');

  try {
    // 1. Setup Data
    const admin = await User.create({ name: 'Admin', email: 'admin@t.com', passwordHash: 'pwd', role: 'Billing Admin' });
    const cust1 = await User.create({ name: 'Cust1', email: 'cust1@t.com', passwordHash: 'pwd', role: 'Customer' });
    const cust2 = await User.create({ name: 'Cust2', email: 'cust2@t.com', passwordHash: 'pwd', role: 'Customer' });

    const { generateToken } = require('../utils/auth');
    const adminToken = generateToken(admin._id, admin.role);
    const cust1Token = generateToken(cust1._id, cust1.role);
    const cust2Token = generateToken(cust2._id, cust2.role);

    const plan = await Plan.create({ name: 'Pro', price: 10, billingCycle: 'monthly' });
    const sub = await Subscription.create({
      customerId: cust1._id, planId: plan._id, status: 'active',
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30*86400000)
    });

    // TEST CASES for Module 1
    console.log('--- Module 1 Tests ---');

    // 1. Happy path - valid request succeeds
    let res = await request(app).post('/api/usage').set('Authorization', `Bearer ${cust1Token}`).send({
      subscriptionId: sub._id, metric: 'api_calls', quantity: 50,
      periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 86400000).toISOString()
    });
    console.log('Case 1 (Happy path 201):', res.status === 201 ? 'PASS' : `FAIL (${res.status} ${JSON.stringify(res.body)})`);

    // 2. Missing required field
    res = await request(app).post('/api/usage').set('Authorization', `Bearer ${cust1Token}`).send({
      subscriptionId: sub._id, metric: 'api_calls' // missing quantity, etc.
    });
    console.log('Case 2 (Missing fields 400):', res.status === 400 ? 'PASS' : `FAIL (${res.status})`);

    // 3. No auth token
    res = await request(app).post('/api/usage').send({ subscriptionId: sub._id });
    console.log('Case 3 (No token 401):', res.status === 401 ? 'PASS' : `FAIL (${res.status})`);

    // 4. Token with wrong role (Customer 2 trying to view Customer 1's usage)
    res = await request(app).get(`/api/usage/${sub._id}`).set('Authorization', `Bearer ${cust2Token}`);
    console.log('Case 4 (Wrong role/owner 403):', res.status === 403 ? 'PASS' : `FAIL (${res.status})`);

    // 5. Business rule conflict (Subscription not active)
    sub.status = 'cancelled'; // We manually mock this for now
    await sub.save();
    res = await request(app).post('/api/usage').set('Authorization', `Bearer ${cust1Token}`).send({
      subscriptionId: sub._id, metric: 'api_calls', quantity: 50,
      periodStart: new Date().toISOString(), periodEnd: new Date().toISOString()
    });
    console.log('Case 5 (Conflict state 409):', res.status === 409 ? 'PASS' : `FAIL (${res.status})`);

    // 6. Non-existent ID
    const fakeId = new mongoose.Types.ObjectId();
    res = await request(app).post('/api/usage').set('Authorization', `Bearer ${cust1Token}`).send({
      subscriptionId: fakeId, metric: 'api_calls', quantity: 50,
      periodStart: new Date().toISOString(), periodEnd: new Date().toISOString()
    });
    console.log('Case 6 (Not found 404):', res.status === 404 ? 'PASS' : `FAIL (${res.status})`);

    console.log('Tests finished!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
runAll();
