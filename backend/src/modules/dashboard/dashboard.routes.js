const express = require('express');
const requireAuth = require('../auth/middleware/requireAuth');
const requirePasswordChanged = require('../auth/middleware/requirePasswordChanged');
const requireModuleView = require('./middleware/requireModuleView');
const dashboardController = require('./dashboard.controller');

const router = express.Router();

router.use(requireAuth, requirePasswordChanged);
router.get('/', dashboardController.getDashboard);
router.get('/modules/:moduleKey', requireModuleView, (req, res) => {
  res.status(501).json({
    error: {
      message: 'You are authorized to view this module, but its feature area is not implemented yet.',
      code: 'MODULE_NOT_IMPLEMENTED',
      requestId: req.requestId,
    },
  });
});

module.exports = router;
