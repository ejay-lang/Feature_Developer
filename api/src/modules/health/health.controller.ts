import type { RequestHandler } from 'express';
import { checkDatabaseConnection } from '../../database/index.js';

export const getHealth: RequestHandler = async (_req, res) => {
  try {
    await checkDatabaseConnection();
    res.status(200).json({
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
    });
  } catch (error) {
    console.error({
      event: 'health.database_unavailable',
      requestId: res.locals.requestId,
      message: error instanceof Error ? error.message : 'Unknown database error',
    });
    res.status(503).json({
      status: 'unavailable',
      database: 'unavailable',
      requestId: res.locals.requestId,
    });
  }
};
