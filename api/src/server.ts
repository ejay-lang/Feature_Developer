import { app } from './app.js';
import { env } from './config/env.js';
import {
  checkDatabaseConnection,
  closeDatabaseConnection,
} from './database/index.js';

let shuttingDown = false;

async function startServer(): Promise<void> {
  await checkDatabaseConnection();

  const server = app.listen(env.port, env.host, () => {
    console.info({
      event: 'server.started',
      host: env.host,
      port: env.port,
      environment: env.nodeEnv,
    });
  });

  server.on('error', (error) => {
    console.error({ event: 'server.error', message: error.message });
    process.exitCode = 1;
  });

  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info({ event: 'server.shutdown_started', signal });

    const forceExit = setTimeout(() => {
      console.error({ event: 'server.shutdown_timeout' });
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close((serverError) => {
      void closeDatabaseConnection()
        .then(() => {
          clearTimeout(forceExit);
          if (serverError) {
            console.error({
              event: 'server.shutdown_error',
              message: serverError.message,
            });
            process.exitCode = 1;
          }
        })
        .catch((error: unknown) => {
          clearTimeout(forceExit);
          console.error({
            event: 'database.shutdown_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          process.exitCode = 1;
        });
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch(async (error: unknown) => {
  console.error({
    event: 'server.startup_failed',
    message: error instanceof Error ? error.message : 'Unknown startup error',
  });
  try {
    await closeDatabaseConnection();
  } catch (shutdownError) {
    console.error({
      event: 'database.shutdown_error',
      message: shutdownError instanceof Error ? shutdownError.message : 'Unknown error',
    });
  }
  process.exitCode = 1;
});
