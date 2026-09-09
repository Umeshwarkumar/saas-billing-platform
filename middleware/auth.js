const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Invalid or missing Bearer token.',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, secret);
    
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Token is invalid or expired.',
      errorCode: 'UNAUTHORIZED'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have access to this resource.',
        errorCode: 'FORBIDDEN'
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
