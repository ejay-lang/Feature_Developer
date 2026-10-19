const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.database.host,
  port: env.database.port,
  user: env.database.user,
  password: env.database.password,
  database: env.database.name,
  connectionLimit: env.database.connectionLimit,
  maxIdle: env.database.connectionLimit,
  idleTimeout: 60000,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: true,
});

async function checkDatabaseConnection() {
  const connection = await pool.getConnection();

  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

async function closeDatabaseConnection() {
  await pool.end();
}

module.exports = {
  pool,
  checkDatabaseConnection,
  closeDatabaseConnection,
};
