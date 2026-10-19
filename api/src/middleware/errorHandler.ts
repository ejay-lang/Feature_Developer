import type { ErrorRequestHandler } from 'express';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

export const errorHandler: ErrorRequestHandler = (error: HttpError, _req, res, _next) => {
  const candidateStatus = error.statusCode ?? error.status;
  const statusCode = Number.isInteger(candidateStatus)
    && candidateStatus !== undefined
    && candidateStatus >= 400
    && candidateStatus <= 599
    ? candidateStatus
    : 500;
  const requestId = res.locals.requestId as string | undefined;

  if (statusCode >= 500) {
    console.error({
      event: 'http.request_error',
      requestId,
      message: error.message,
      stack: error.stack,
    });
  }

  res.status(statusCode).json({
    error: {
      code: statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : error.code || 'REQUEST_ERROR',
      message: statusCode === 500 ? 'An unexpected error occurred.' : error.message,
      requestId,
    },
  });
};
