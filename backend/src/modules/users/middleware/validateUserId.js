function validateUserId(req, res, next) {
  if (!/^[1-9]\d{0,19}$/.test(req.params.id)
    || BigInt(req.params.id) > 18446744073709551615n) {
    const error = new Error('User ID must be a positive integer.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  return next();
}

module.exports = validateUserId;
