/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Safe generic response structure
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errorCode: 'INTERNAL_SERVER_ERROR'
  });
};

module.exports = errorHandler;
