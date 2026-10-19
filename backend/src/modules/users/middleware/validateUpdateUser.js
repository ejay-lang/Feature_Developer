const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(['user', 'admin', 'superadmin']);
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

function validateUpdateUser(req, res, next) {
  const body = req.body;
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Request body must be a JSON object.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  const allowedFields = new Set(['firstName', 'lastName', 'email', 'role']);
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unknownFields.length) {
    errors.push({ field: 'body', message: `Unsupported fields: ${unknownFields.join(', ')}.` });
  }
  if (!Object.keys(body).length) {
    errors.push({ field: 'body', message: 'Provide at least one field to update.' });
  }

  const update = {};
  if (Object.hasOwn(body, 'firstName')) {
    if (typeof body.firstName !== 'string' || !body.firstName.trim()
      || [...body.firstName.trim()].length > 100 || CONTROL_CHARACTERS.test(body.firstName)) {
      errors.push({ field: 'firstName', message: 'First name is required and must be at most 100 characters.' });
    } else {
      update.firstName = body.firstName.trim();
    }
  }
  if (Object.hasOwn(body, 'lastName')) {
    if (typeof body.lastName !== 'string' || !body.lastName.trim()
      || [...body.lastName.trim()].length > 100 || CONTROL_CHARACTERS.test(body.lastName)) {
      errors.push({ field: 'lastName', message: 'Last name is required and must be at most 100 characters.' });
    } else {
      update.lastName = body.lastName.trim();
    }
  }
  if (Object.hasOwn(body, 'email')) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      errors.push({ field: 'email', message: 'Enter a valid email address of at most 254 characters.' });
    } else {
      update.email = email;
    }
  }
  if (Object.hasOwn(body, 'role')) {
    if (typeof body.role !== 'string' || !VALID_ROLES.has(body.role)) {
      errors.push({ field: 'role', message: 'Role must be user, admin, or superadmin.' });
    } else if (req.user.role === 'admin' && body.role !== 'user') {
      const error = new Error('Admins may only manage regular user accounts.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    } else {
      update.role = body.role;
    }
  }

  if (errors.length) {
    const error = new Error('Please correct the highlighted fields.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = errors;
    return next(error);
  }

  req.userUpdate = update;
  return next();
}

module.exports = validateUpdateUser;
