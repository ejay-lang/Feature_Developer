const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForgotPassword(req, res, next) {
  const { email } = req.body || {};

  if (typeof email !== 'string' || !email.trim()
    || email.trim().length > 254
    || !EMAIL_PATTERN.test(email.trim())) {
    const error = new Error('Enter a valid email address.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = [{ field: 'email', message: 'Enter a valid email address.' }];
    return next(error);
  }

  req.resetEmail = email.trim().toLowerCase();
  return next();
}

module.exports = validateForgotPassword;
