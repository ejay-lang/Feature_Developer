const express = require('express');
const requireAuth = require('../auth/middleware/requireAuth');
const requirePasswordChanged = require('../auth/middleware/requirePasswordChanged');
const verifyRequestOrigin = require('../auth/middleware/verifyRequestOrigin');
const allowRoles = require('../users/middleware/allowRoles');
const validateUserId = require('../users/middleware/validateUserId');
const validatePermissions = require('./middleware/validatePermissions');
const rightsController = require('./rights.controller');

const router = express.Router();

router.use(requireAuth, requirePasswordChanged, allowRoles('superadmin', 'admin'));
router.get('/permissions', rightsController.listCatalog);
router.get('/users/:id/permissions', validateUserId, rightsController.getUserPermissions);
router.get('/users/:id/audit', validateUserId, rightsController.getUserAudit);
router.put(
  '/users/:id/permissions',
  verifyRequestOrigin,
  validateUserId,
  validatePermissions,
  rightsController.saveUserPermissions,
);

module.exports = router;
