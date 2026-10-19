function validateRoleChange(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)
    || Object.keys(req.body).length !== 1 || !['admin', 'user'].includes(req.body.role)) {
    const error = new Error('Role must be either admin or user.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = [{ field: 'role', message: 'Role must be either admin or user.' }];
    return next(error);
  }

  req.requestedRole = req.body.role;
  return next();
}

module.exports = validateRoleChange;
