const rateLimit = require('express-rate-limit');

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      error: {
        message: 'Too many login attempts. Please try again later.',
        code: 'LOGIN_RATE_LIMITED',
        requestId: req.requestId,
      },
    });
  },
});

module.exports = loginRateLimit;
