const dashboardService = require('./dashboard.service');

async function getDashboard(req, res, next) {
  try {
    res.status(200).json(await dashboardService.getDashboard(req.user));
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard };
