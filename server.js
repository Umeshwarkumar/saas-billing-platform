const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const planRoutes = require('./routes/planRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'P17 SaaS Billing API is running',
    data: {
      status: 'OK'
    }
  });
});

// 404 Handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errorCode: 'NOT_FOUND'
  });
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB, then start the server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to MongoDB connection error');
    process.exit(1);
  }
};

startServer();
