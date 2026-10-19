import 'dotenv/config';

type NodeEnvironment = 'development' | 'test' | 'production';

function requiredString(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseInteger(name: string, value: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function parseBoolean(name: string, value: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be either "true" or "false".`);
}

function parseUrl(name: string, value: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error();
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${name} must be a valid HTTP or HTTPS URL.`);
  }
}

const nodeEnvValue = process.env.NODE_ENV?.trim() || 'development';
if (!['development', 'test', 'production'].includes(nodeEnvValue)) {
  throw new Error('NODE_ENV must be development, test, or production.');
}

const databaseUrl = requiredString('DATABASE_URL');
try {
  const parsed = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error();
  }
} catch {
  throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
}

const supabaseAnonKey = requiredString('SUPABASE_ANON_KEY');
if (supabaseAnonKey.startsWith('sb_secret_')) {
  throw new Error('SUPABASE_ANON_KEY must not contain a Supabase secret key.');
}
const legacyKeyPayload = supabaseAnonKey.split('.')[1];
if (legacyKeyPayload) {
  let payload: { role?: unknown } | undefined;
  try {
    payload = JSON.parse(
      Buffer.from(legacyKeyPayload, 'base64url').toString('utf8'),
    ) as { role?: unknown };
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    // Current publishable keys are opaque; only legacy JWT keys have a role claim.
  }
  if (payload?.role === 'service_role') {
    throw new Error('SUPABASE_ANON_KEY must not contain a service_role key.');
  }
}

const dbSslValue = process.env.DB_SSL?.trim()
  || (nodeEnvValue === 'production' ? 'true' : 'false');
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => parseUrl('CORS_ORIGINS entry', origin));

if (!corsOrigins.length) {
  throw new Error('CORS_ORIGINS must contain at least one allowed origin.');
}

export const env = Object.freeze({
  nodeEnv: nodeEnvValue as NodeEnvironment,
  host: process.env.HOST?.trim() || '0.0.0.0',
  port: parseInteger('PORT', process.env.PORT?.trim() || '4000', 1, 65535),
  corsOrigins,
  databaseUrl,
  databaseSsl: parseBoolean('DB_SSL', dbSslValue),
  databasePoolMax: parseInteger(
    'DB_POOL_MAX',
    process.env.DB_POOL_MAX?.trim() || '10',
    1,
    100,
  ),
  supabaseUrl: parseUrl('SUPABASE_URL', requiredString('SUPABASE_URL')),
  supabaseAnonKey,
});
