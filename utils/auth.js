const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign({ userId, role }, secret, { expiresIn });
};

module.exports = { generateToken };
