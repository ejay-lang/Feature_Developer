const express = require('express');
const {
  register,
  login,
  logout,
  changePassword,
  getCurrentUser,
  getProtectedResource,
} = require('./auth.controller');
const { forgotPassword, resetPassword } = require('./passwordReset.controller');
const validateRegistration = require('./middleware/validateRegistration');
const validateLogin = require('./middleware/validateLogin');
const validatePasswordChange = require('./middleware/validatePasswordChange');
const requireAuth = require('./middleware/requireAuth');
const requirePasswordChanged = require('./middleware/requirePasswordChanged');
const verifyRequestOrigin = require('./middleware/verifyRequestOrigin');
const loginRateLimit = require('./middleware/loginRateLimit');
const validateForgotPassword = require('./middleware/validateForgotPassword');
const validateResetPassword = require('./middleware/validateResetPassword');
const { forgotPasswordRateLimit, resetPasswordRateLimit } = require('./middleware/passwordResetRateLimit');

const router = express.Router();

router.post('/register', verifyRequestOrigin, validateRegistration, register);
router.post('/login', verifyRequestOrigin, loginRateLimit, validateLogin, login);
router.post(
  '/forgot-password',
  verifyRequestOrigin,
  forgotPasswordRateLimit,
  validateForgotPassword,
  forgotPassword,
);
router.post(
  '/reset-password',
  verifyRequestOrigin,
  resetPasswordRateLimit,
  validateResetPassword,
  resetPassword,
);
router.post('/logout', verifyRequestOrigin, logout);
router.post(
  '/change-password',
  verifyRequestOrigin,
  requireAuth,
  validatePasswordChange,
  changePassword,
);
router.get('/me', requireAuth, getCurrentUser);
router.get('/protected', requireAuth, requirePasswordChanged, getProtectedResource);

module.exports = router;
