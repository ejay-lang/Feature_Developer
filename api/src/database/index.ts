import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const database = new Pool({
  connectionString: env.databaseUrl,
  max: env.databasePoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(env.databaseSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  application_name: 'hope-system-api',
});

database.on('error', (error) => {
  console.error({
    event: 'database.idle_client_error',
    message: error.message,
  });
});

export async function checkDatabaseConnection(): Promise<void> {
  await database.query('SELECT 1');
}

export async function closeDatabaseConnection(): Promise<void> {
  await database.end();
}
