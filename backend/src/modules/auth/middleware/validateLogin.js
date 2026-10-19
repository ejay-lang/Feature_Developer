const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const errors = [];

  if (typeof email !== 'string' || !email.trim()) {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else if (email.trim().length > 254 || !EMAIL_PATTERN.test(email.trim())) {
    errors.push({ field: 'email', message: 'Enter a valid email address.' });
  }

  if (typeof password !== 'string' || !password) {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else if (Buffer.byteLength(password, 'utf8') > 72) {
    errors.push({ field: 'password', message: 'Password must not exceed 72 UTF-8 bytes.' });
  }

  if (errors.length) {
    const error = new Error('Please correct the highlighted fields.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = errors;
    return next(error);
  }

  req.loginCredentials = {
    email: email.trim().toLowerCase(),
    password,
  };
  return next();
}

module.exports = validateLogin;
