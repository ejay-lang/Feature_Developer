function allowRoles(...allowedRoles) {
  return function roleAuthorization(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const error = new Error('You are not authorized to manage users.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    return next();
  };
}

module.exports = allowRoles;
