const axios = require('axios');
const mongoose = require('mongoose');

const API = 'http://localhost:5000/api';

async function runTests() {
  try {
    console.log('--- Registering Users ---');
    let res = await axios.post(`${API}/auth/register`, { name: 'Admin', email: 'admin1@test.com', password: 'password' });
    const adminId = res.data.data.user.id;
    // Force admin in DB since register always forces Customer
    await mongoose.connect('mongodb://127.0.0.1:27017/saas-billing'); // Wait, the memory server URI is dynamic!
    // I can't connect directly from outside easily unless I export the URI.
    // Instead, I will write the test script to run INSIDE the node process, or I just use the API.
  } catch(e) {}
}
