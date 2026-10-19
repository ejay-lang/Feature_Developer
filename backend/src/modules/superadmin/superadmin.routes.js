const express = require('express');
const requireAuth = require('../auth/middleware/requireAuth');
const requirePasswordChanged = require('../auth/middleware/requirePasswordChanged');
const verifyRequestOrigin = require('../auth/middleware/verifyRequestOrigin');
const allowRoles = require('../users/middleware/allowRoles');
const validateUserId = require('../users/middleware/validateUserId');
const validateDashboardQuery = require('./middleware/validateDashboardQuery');
const validateRoleChange = require('./middleware/validateRoleChange');
const controller = require('./superadmin.controller');

const router = express.Router();

router.use(requireAuth, requirePasswordChanged, allowRoles('superadmin'));
router.get('/summary', controller.getSummary);
router.get('/users', validateDashboardQuery, controller.listUsers);
router.get('/pending', validateDashboardQuery, controller.listPending);
router.post('/users/:id/approve', verifyRequestOrigin, validateUserId, controller.approve);
router.post('/users/:id/reject', verifyRequestOrigin, validateUserId, controller.reject);
router.post('/users/:id/promote', verifyRequestOrigin, validateUserId, controller.promote);
router.post('/users/:id/demote', verifyRequestOrigin, validateUserId, controller.demote);
router.patch('/users/:id/role', verifyRequestOrigin, validateUserId, validateRoleChange, controller.setRole);
router.post('/users/:id/block', verifyRequestOrigin, validateUserId, controller.block);
router.post('/users/:id/unblock', verifyRequestOrigin, validateUserId, controller.unblock);
router.post('/users/:id/disable', verifyRequestOrigin, validateUserId, controller.disable);
router.post('/users/:id/enable', verifyRequestOrigin, validateUserId, controller.enable);

module.exports = router;
