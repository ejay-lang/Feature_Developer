const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
const VALID_ROLES = new Set(['user', 'admin', 'superadmin']);

function validateCreateUser(req, res, next) {
  const { firstName, lastName, email, password, role } = req.body || {};
  const errors = [];

  if (typeof firstName !== 'string' || !firstName.trim()
    || [...firstName.trim()].length > 100 || CONTROL_CHARACTERS.test(firstName)) {
    errors.push({ field: 'firstName', message: 'First name is required and must be at most 100 characters.' });
  }
  if (typeof lastName !== 'string' || !lastName.trim()
    || [...lastName.trim()].length > 100 || CONTROL_CHARACTERS.test(lastName)) {
    errors.push({ field: 'lastName', message: 'Last name is required and must be at most 100 characters.' });
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail || normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
    errors.push({ field: 'email', message: 'Enter a valid email address of at most 254 characters.' });
  }

  if (typeof password !== 'string' || [...password].length < 12
    || Buffer.byteLength(password, 'utf8') > 72) {
    errors.push({ field: 'password', message: 'Initial password must be at least 12 characters and at most 72 UTF-8 bytes.' });
  }

  const normalizedRole = role === undefined ? 'user' : role;
  if (typeof normalizedRole !== 'string' || !VALID_ROLES.has(normalizedRole)) {
    errors.push({ field: 'role', message: 'Role must be user, admin, or superadmin.' });
  } else if (req.user.role === 'admin' && normalizedRole !== 'user') {
    const error = new Error('Admins may only create regular user accounts.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    return next(error);
  }

  if (errors.length) {
    const error = new Error('Please correct the highlighted fields.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = errors;
    return next(error);
  }

  req.newUser = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    password,
    role: normalizedRole,
  };
  return next();
}

module.exports = validateCreateUser;
