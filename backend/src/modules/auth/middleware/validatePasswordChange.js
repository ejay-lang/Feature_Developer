function validatePasswordChange(req, res, next) {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  const errors = [];

  if (typeof currentPassword !== 'string' || !currentPassword) {
    errors.push({ field: 'currentPassword', message: 'Current password is required.' });
  } else if (Buffer.byteLength(currentPassword, 'utf8') > 72) {
    errors.push({ field: 'currentPassword', message: 'Current password exceeds the bcrypt input limit.' });
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
    if (typeof currentPassword === 'string' && newPassword === currentPassword) {
      errors.push({ field: 'newPassword', message: 'New password must differ from the current password.' });
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

  req.passwordChange = { currentPassword, newPassword };
  return next();
}

module.exports = validatePasswordChange;
