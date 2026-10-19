const { checkDatabaseConnection } = require('../../config/database');

async function getHealth(req, res, next) {
  try {
    await checkDatabaseConnection();
    res.status(200).json({
      status: 'ok',
      checks: {
        database: 'ok',
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const unavailableError = new Error('Database health check failed.');
    unavailableError.statusCode = 503;
    unavailableError.cause = error;
    next(unavailableError);
  }
}

module.exports = {
  getHealth,
};
