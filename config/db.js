const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    try {
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
      console.log(`Failed connecting to ${uri}, falling back to mongodb-memory-server...`);
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB Memory Server Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Throw error to be handled by the caller
    throw error;
  }
};

module.exports = connectDB;
