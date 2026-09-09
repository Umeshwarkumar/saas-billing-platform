const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { validateRegister, validateLogin, checkValidation } = require('../validators/authValidator');
const { authenticate } = require('../middleware/auth');

router.post('/register', validateRegister, checkValidation, register);
router.post('/login', validateLogin, checkValidation, login);
router.get('/me', authenticate, getMe);

module.exports = router;
