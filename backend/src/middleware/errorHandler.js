function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const errorStatus = error.statusCode || error.status;
  const statusCode = Number.isInteger(errorStatus)
    && errorStatus >= 400
    && errorStatus <= 599
    ? errorStatus
    : 500;
  const message = statusCode === 500 ? 'Internal server error.' : error.message;

  if (statusCode >= 500) {
    console.error({
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      requestId: req.requestId,
    });
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(error.code ? { code: error.code } : {}),
      ...(error.details ? { details: error.details } : {}),
      requestId: req.requestId,
    },
  });
}

module.exports = errorHandler;
