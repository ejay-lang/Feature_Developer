const express = require('express');
const cors = require('cors');
const path = require('node:path');
const env = require('./config/env');
const requestId = require('./middleware/requestId');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./modules/health/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const superadminRoutes = require('./modules/superadmin/superadmin.routes');
const rightsRoutes = require('./modules/rights/rights.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const requireAuth = require('./modules/auth/middleware/requireAuth');
const requirePasswordChanged = require('./modules/auth/middleware/requirePasswordChanged');
const allowRoles = require('./modules/users/middleware/allowRoles');
const requireModuleView = require('./modules/dashboard/middleware/requireModuleView');
const { sessionMiddleware } = require('./config/session');

const app = express();

app.disable('x-powered-by');
if (env.trustProxy) {
  app.set('trust proxy', 1);
}
app.use(requestId);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error('Origin is not allowed by CORS.');
    error.statusCode = 403;
    return callback(error);
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(sessionMiddleware);
app.get('/dashboard', requireAuth, requirePasswordChanged, (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
  });
  res.sendFile(path.join(__dirname, 'modules', 'dashboard', 'views', 'dashboard.html'), (error) => {
    if (error) next(error);
  });
});
app.get('/modules/:moduleKey', requireAuth, requirePasswordChanged, requireModuleView, (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
  });
  res.status(501).sendFile(
    path.join(__dirname, 'modules', 'dashboard', 'views', 'module-not-implemented.html'),
    (error) => {
      if (error) next(error);
    },
  );
});
app.get(
  ['/user-management', '/users.html'],
  requireAuth,
  requirePasswordChanged,
  allowRoles('superadmin', 'admin'),
  (req, res) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
    });
    res.sendFile(path.join(__dirname, '..', 'public', 'users.html'));
  },
);
app.get(
  '/rights-management',
  requireAuth,
  requirePasswordChanged,
  allowRoles('superadmin', 'admin'),
  (req, res) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
    });
    res.sendFile(path.join(__dirname, '..', 'public', 'users.html'));
  },
);
app.get(
  ['/superadmin', '/superadmin.html'],
  requireAuth,
  requirePasswordChanged,
  allowRoles('superadmin'),
  (req, res) => {
    res.set({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
    });
    res.sendFile(path.join(__dirname, '..', 'public', 'superadmin.html'));
  },
);
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});
app.get(['/login', '/change-password'], (req, res) => {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
  });
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});
app.get('/forgot-password', (req, res) => {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
  });
  res.sendFile(path.join(__dirname, '..', 'public', 'forgot-password.html'));
});
app.get('/reset-password', (req, res) => {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
  });
  res.sendFile(path.join(__dirname, '..', 'public', 'reset-password.html'));
});
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/rights', rightsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/v1/health', healthRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
