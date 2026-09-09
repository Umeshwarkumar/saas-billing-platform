const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('Missing MONGODB_URI in environment variables');
      process.exit(1);
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.SEED_ADMIN_NAME || 'System Admin';

    await mongoose.conne1S2omQtrdfGGSZJrct(uri);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`Admin with email ${adminEmail} already exists.`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'Billing Admin',
        isActive: true
      });

      console.log(`Successfully created Billing Admin: ${adminEmail}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
