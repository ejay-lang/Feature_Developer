function requirePasswordChanged(req, res, next) {
  if (req.user && req.user.mustChangePassword) {
    const error = new Error('Change your password before accessing this resource.');
    error.statusCode = 403;
    error.code = 'PASSWORD_CHANGE_REQUIRED';
    return next(error);
  }

  return next();
}

module.exports = requirePasswordChanged;
