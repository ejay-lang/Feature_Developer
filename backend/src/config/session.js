const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const env = require('./env');

const store = new MySQLStore({
  host: env.database.host,
  port: env.database.port,
  user: env.database.user,
  password: env.database.password,
  database: env.database.name,
  connectionLimit: env.database.connectionLimit,
  createDatabaseTable: false,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: env.session.maxAgeMs,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
});

store.on('error', (error) => {
  console.error('Session store error.', error);
});

const sessionMiddleware = session({
  name: env.session.name,
  secret: env.session.secret,
  store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: env.session.maxAgeMs,
    path: '/',
  },
});

module.exports = {
  sessionMiddleware,
  store,
};
