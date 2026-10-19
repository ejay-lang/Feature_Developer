const dotenv = require('dotenv');

dotenv.config();

function readPositiveInteger(name, defaultValue, maximum = Number.MAX_SAFE_INTEGER) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === '') {
    return defaultValue;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const supportedEnvironments = ['development', 'test', 'production'];

if (!supportedEnvironments.includes(nodeEnv)) {
  throw new Error(`NODE_ENV must be one of: ${supportedEnvironments.join(', ')}.`);
}

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:4000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const sessionSecret = process.env.SESSION_SECRET || '';
if (Buffer.byteLength(sessionSecret, 'utf8') < 32) {
  throw new Error('SESSION_SECRET must be set to a secret of at least 32 UTF-8 bytes.');
}
if (sessionSecret === 'replace-with-a-unique-random-secret-at-least-32-characters') {
  throw new Error('Replace the SESSION_SECRET example value with a randomly generated secret.');
}
const sessionName = process.env.SESSION_NAME || 'hope.sid';
if (!/^[A-Za-z0-9._-]+$/.test(sessionName)) {
  throw new Error('SESSION_NAME may contain only letters, numbers, dots, underscores, and hyphens.');
}
const trustProxyValue = process.env.TRUST_PROXY || 'false';
if (!['true', 'false'].includes(trustProxyValue)) {
  throw new Error('TRUST_PROXY must be either true or false.');
}
const smtpSecureValue = process.env.SMTP_SECURE || 'false';
if (!['true', 'false'].includes(smtpSecureValue)) {
  throw new Error('SMTP_SECURE must be either true or false.');
}
const appBaseUrlValue = process.env.APP_BASE_URL || 'http://localhost:4000';
let appBaseUrl;
try {
  appBaseUrl = new URL(appBaseUrlValue);
} catch {
  throw new Error('APP_BASE_URL must be a valid absolute URL.');
}
if (!['http:', 'https:'].includes(appBaseUrl.protocol)
  || appBaseUrl.username
  || appBaseUrl.password
  || appBaseUrl.search
  || appBaseUrl.hash) {
  throw new Error('APP_BASE_URL must use HTTP(S) and must not contain credentials, a query, or a fragment.');
}
if (nodeEnv === 'production' && appBaseUrl.protocol !== 'https:') {
  throw new Error('APP_BASE_URL must use HTTPS in production.');
}
const smtpHost = process.env.SMTP_HOST || '';
const smtpUser = process.env.SMTP_USER || '';
const smtpPassword = process.env.SMTP_PASS || '';
const smtpFrom = process.env.SMTP_FROM || '';
if ((smtpUser && !smtpPassword) || (!smtpUser && smtpPassword)) {
  throw new Error('Set both SMTP_USER and SMTP_PASS, or leave both empty.');
}
if (/[\r\n]/.test(smtpFrom)) {
  throw new Error('SMTP_FROM must not contain line breaks.');
}
if (nodeEnv === 'production' && (!smtpHost || !smtpFrom)) {
  throw new Error('SMTP_HOST and SMTP_FROM must be configured in production.');
}
if (nodeEnv === 'production' && /@example\.com(?:>|$)/i.test(smtpFrom)) {
  throw new Error('Replace the example SMTP_FROM address with a verified production sender.');
}

module.exports = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: readPositiveInteger('PORT', 4000, 65535),
  corsOrigins,
  session: Object.freeze({
    secret: sessionSecret,
    name: sessionName,
    maxAgeMs: readPositiveInteger('SESSION_MAX_AGE_MS', 8 * 60 * 60 * 1000),
  }),
  trustProxy: trustProxyValue === 'true',
  appBaseUrl: appBaseUrl.toString().replace(/\/$/, ''),
  mail: Object.freeze({
    host: smtpHost,
    port: readPositiveInteger('SMTP_PORT', 587, 65535),
    secure: smtpSecureValue === 'true',
    user: smtpUser,
    password: smtpPassword,
    from: smtpFrom,
  }),
  database: Object.freeze({
    host: process.env.DB_HOST || 'localhost',
    port: readPositiveInteger('DB_PORT', 3306, 65535),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'hope_system',
    connectionLimit: readPositiveInteger('DB_CONNECTION_LIMIT', 10),
  }),
});
