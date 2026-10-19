const bcrypt = require('bcrypt');
const { createHash, randomBytes } = require('node:crypto');
const env = require('../../config/env');
const passwordResetModel = require('./passwordReset.model');
const emailService = require('./services/email.service');

const BCRYPT_SALT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const pendingEmailJobs = new Set();

function hashResetToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

async function preparePasswordReset(email) {
  const token = randomBytes(RESET_TOKEN_BYTES).toString('base64url');
  const tokenHash = hashResetToken(token);
  const user = await passwordResetModel.createResetTokenForActiveUser({
    email,
    tokenHash,
  });

  if (!user) {
    return null;
  }

  const resetUrl = new URL('/reset-password', `${env.appBaseUrl}/`);
  resetUrl.hash = new URLSearchParams({ token }).toString();

  return {
    email: user.email,
    firstName: user.firstName,
    resetUrl: resetUrl.toString(),
    tokenHash,
  };
}

async function deliverPasswordResetEmail(resetRequest) {
  try {
    await emailService.sendPasswordResetEmail(resetRequest);
  } catch (error) {
    await passwordResetModel.invalidateResetToken(resetRequest.tokenHash);
    throw error;
  }
}

function queuePasswordResetEmail(resetRequest) {
  const job = new Promise((resolve, reject) => {
    setImmediate(() => {
      deliverPasswordResetEmail(resetRequest).then(resolve, reject);
    });
  });

  pendingEmailJobs.add(job);
  job.then(
    () => pendingEmailJobs.delete(job),
    () => pendingEmailJobs.delete(job),
  );

  return job;
}

async function waitForPendingEmailJobs() {
  await Promise.allSettled([...pendingEmailJobs]);
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = hashResetToken(token);
  const resetToken = await passwordResetModel.findValidResetToken(tokenHash);

  if (!resetToken) {
    const error = new Error('This password reset link is invalid or has expired.');
    error.statusCode = 400;
    error.code = 'RESET_TOKEN_INVALID';
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  const updated = await passwordResetModel.consumeResetTokenAndUpdatePassword({
    tokenHash,
    userId: resetToken.userId,
    passwordHash,
  });

  if (!updated) {
    const error = new Error('This password reset link is invalid or has expired.');
    error.statusCode = 400;
    error.code = 'RESET_TOKEN_INVALID';
    throw error;
  }
}

module.exports = {
  preparePasswordReset,
  queuePasswordResetEmail,
  waitForPendingEmailJobs,
  resetPassword,
};
