const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

function validateRegistration(req, res, next) {
  const body = req.body;
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Request body must be a JSON object.');
    error.statusCode = 400;
    return next(error);
  }

  const { firstName, lastName, email, password, confirmPassword } = body;

  if (typeof firstName !== 'string' || !firstName.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required.' });
  } else if ([...firstName.trim()].length > 100 || CONTROL_CHARACTERS.test(firstName)) {
    errors.push({ field: 'firstName', message: 'First name must be at most 100 characters and contain no control characters.' });
  }

  if (typeof lastName !== 'string' || !lastName.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required.' });
  } else if ([...lastName.trim()].length > 100 || CONTROL_CHARACTERS.test(lastName)) {
    errors.push({ field: 'lastName', message: 'Last name must be at most 100 characters and contain no control characters.' });
  }

  if (typeof email !== 'string' || !email.trim()) {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
      errors.push({ field: 'email', message: 'Enter a valid email address of at most 254 characters.' });
    }
  }

  if (typeof password !== 'string' || !password) {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else {
    if ([...password].length < 12) {
      errors.push({ field: 'password', message: 'Password must be at least 12 characters.' });
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
      errors.push({ field: 'password', message: 'Password must not exceed 72 UTF-8 bytes.' });
    }
  }

  if (typeof confirmPassword !== 'string' || !confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Please confirm your password.' });
  } else if (typeof password === 'string' && password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
  }

  if (errors.length) {
    const error = new Error('Please correct the highlighted fields.');
    error.statusCode = 400;
    error.details = errors;
    return next(error);
  }

  req.registration = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    password,
  };

  return next();
}

module.exports = validateRegistration;
