const bcrypt = require('bcrypt');
const { randomBytes } = require('node:crypto');
const authModel = require('./auth.model');

const BCRYPT_SALT_ROUNDS = 12;
let dummyPasswordHash;

function getDummyPasswordHash() {
  if (!dummyPasswordHash) {
    dummyPasswordHash = bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_SALT_ROUNDS);
  }

  return dummyPasswordHash;
}

async function registerUser({ firstName, lastName, email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  try {
    return await authModel.createUser({
      firstName,
      lastName,
      email,
      passwordHash,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const conflict = new Error('An account with this email already exists.');
      conflict.statusCode = 409;
      conflict.code = 'EMAIL_ALREADY_REGISTERED';
      throw conflict;
    }

    throw error;
  }
}

async function authenticateUser({ email, password }) {
  const user = await authModel.findUserByEmail(email);
  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.passwordHash : await getDummyPasswordHash(),
  );

  if (!user || !passwordMatches) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (user.status !== 'active') {
    const error = new Error('This account cannot sign in.');
    error.statusCode = 403;
    error.code = `ACCOUNT_${user.status.toUpperCase()}`;
    throw error;
  }

  return {
    id: String(user.id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: user.status,
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
    sessionVersion: user.sessionVersion,
  };
}

async function changeUserPassword({ userId, currentPassword, newPassword }) {
  const user = await authModel.findUserById(userId);

  if (!user || user.status !== 'active') {
    const error = new Error('This account is not active.');
    error.statusCode = 403;
    error.code = 'ACCOUNT_NOT_ACTIVE';
    throw error;
  }

  const currentPasswordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentPasswordMatches) {
    const error = new Error('Current password is incorrect.');
    error.statusCode = 400;
    error.code = 'CURRENT_PASSWORD_INVALID';
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  const sessionVersion = await authModel.updatePassword(
    userId,
    passwordHash,
    user.sessionVersion,
  );
  if (sessionVersion === null) {
    const error = new Error('The account changed while updating the password. Please sign in again.');
    error.statusCode = 401;
    error.code = 'SESSION_INVALIDATED';
    throw error;
  }

  return sessionVersion;
}

module.exports = {
  registerUser,
  authenticateUser,
  changeUserPassword,
};
