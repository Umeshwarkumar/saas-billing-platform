const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/auth');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
        errorCode: 'DUPLICATE_EMAIL'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user (force role to Customer)
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: 'Customer',
      isActive: true
    });

    // Generate JWT
    const token = generateToken(newUser._id, newUser.role);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        },
        token
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered',
        errorCode: 'DUPLICATE_EMAIL'
      });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errorCode: 'INVALID_CREDENTIALS'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errorCode: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is inactive. Please contact support.',
        errorCode: 'ACCOUNT_INACTIVE'
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const { userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        errorCode: 'INVALID_USER_ID'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Current user retrieved successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};
