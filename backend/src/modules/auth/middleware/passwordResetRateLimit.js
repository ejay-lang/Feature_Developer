const rateLimit = require('express-rate-limit');

function createPasswordResetRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({
        error: {
          message: 'Too many password reset requests. Please try again later.',
          code: 'RESET_RATE_LIMITED',
          requestId: req.requestId,
        },
      });
    },
  });
}

module.exports = {
  forgotPasswordRateLimit: createPasswordResetRateLimit(),
  resetPasswordRateLimit: createPasswordResetRateLimit(),
};
