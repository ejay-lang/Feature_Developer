const app = require('./app');
const env = require('./config/env');
const { closeDatabaseConnection } = require('./config/database');
const { store: sessionStore } = require('./config/session');
const passwordResetService = require('./modules/auth/passwordReset.service');

let server;
let sessionStoreClosed = false;
let databaseClosed = false;

async function closeSessionStore() {
  if (!sessionStoreClosed) {
    sessionStoreClosed = true;
    await sessionStore.close();
  }
}

async function closeDatabase() {
  if (!databaseClosed) {
    databaseClosed = true;
    await closeDatabaseConnection();
  }
}

const startup = sessionStore.onReady()
  .then(() => {
    server = app.listen(env.port, () => {
      console.log(`HOPE System API listening on port ${env.port} (${env.nodeEnv}).`);
    });
  })
  .catch(async (error) => {
    console.error('Could not initialize the MySQL session store.', error);
    process.exitCode = 1;
    try {
      await closeSessionStore();
      await closeDatabase();
    } catch (cleanupError) {
      console.error('Could not close database connections after startup failure.', cleanupError);
    }
  });

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received; shutting down gracefully.`);

  try {
    await startup;
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
    await passwordResetService.waitForPendingEmailJobs();
    await closeSessionStore();
    await closeDatabase();
    console.log('Shutdown complete.');
  } catch (error) {
    console.error('Graceful shutdown failed.', error);
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
