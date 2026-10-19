const nodemailer = require('nodemailer');
const env = require('../../../config/env');

let transporter;

function getTransporter() {
  if (!env.mail.host || !env.mail.from) {
    const error = new Error('SMTP_HOST and SMTP_FROM must be configured to send password reset email.');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      requireTLS: !env.mail.secure,
      auth: env.mail.user
        ? {
          user: env.mail.user,
          pass: env.mail.password,
        }
        : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  return transporter;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function sendPasswordResetEmail({ email, firstName, resetUrl }) {
  const mailer = getTransporter();
  const textGreeting = firstName ? `Hello ${firstName},` : 'Hello,';
  const htmlGreeting = firstName ? `Hello ${escapeHtml(firstName)},` : 'Hello,';

  await mailer.sendMail({
    from: env.mail.from,
    to: email,
    subject: 'Reset your HOPE System password',
    text: `${textGreeting}\n\nWe received a request to reset your HOPE System password. Use this link within one hour:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>${htmlGreeting}</p>
      <p>We received a request to reset your HOPE System password. Use the link below within one hour:</p>
      <p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>
      <p>If you did not request this, you can ignore this email.</p>`,
  });
}

module.exports = {
  sendPasswordResetEmail,
};
