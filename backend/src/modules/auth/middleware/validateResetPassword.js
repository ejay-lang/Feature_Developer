const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function validateResetPassword(req, res, next) {
  const { token, newPassword, confirmPassword } = req.body || {};
  const errors = [];

  if (typeof token !== 'string' || !RESET_TOKEN_PATTERN.test(token)) {
    errors.push({ field: 'token', message: 'A valid password reset token is required.' });
  }

  if (typeof newPassword !== 'string' || !newPassword) {
    errors.push({ field: 'newPassword', message: 'New password is required.' });
  } else {
    if ([...newPassword].length < 12) {
      errors.push({ field: 'newPassword', message: 'New password must be at least 12 characters.' });
    }
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      errors.push({ field: 'newPassword', message: 'New password must not exceed 72 UTF-8 bytes.' });
    }
  }

  if (typeof confirmPassword !== 'string' || !confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Please confirm your new password.' });
  } else if (typeof newPassword === 'string' && confirmPassword !== newPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
  }

  if (errors.length) {
    const error = new Error('Please correct the highlighted fields.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = errors;
    return next(error);
  }

  req.resetPassword = { token, newPassword };
  return next();
}

module.exports = validateResetPassword;
