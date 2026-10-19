const env = require('../../../config/env');

function verifyRequestOrigin(req, res, next) {
  const origin = req.get('Origin');

  if (!origin || env.corsOrigins.includes(origin)) {
    return next();
  }

  const error = new Error('Origin is not allowed.');
  error.statusCode = 403;
  error.code = 'ORIGIN_NOT_ALLOWED';
  return next(error);
}

module.exports = verifyRequestOrigin;
