const express = require('express');
const requireAuth = require('../auth/middleware/requireAuth');
const requirePasswordChanged = require('../auth/middleware/requirePasswordChanged');
const allowRoles = require('./middleware/allowRoles');
const verifyRequestOrigin = require('../auth/middleware/verifyRequestOrigin');
const validateUserList = require('./middleware/validateUserList');
const validateUserId = require('./middleware/validateUserId');
const validateCreateUser = require('./middleware/validateCreateUser');
const validateUpdateUser = require('./middleware/validateUpdateUser');
const usersController = require('./users.controller');

const router = express.Router();

router.use(requireAuth, requirePasswordChanged, allowRoles('superadmin', 'admin'));
router.get('/', validateUserList, usersController.listUsers);
router.post('/', verifyRequestOrigin, validateCreateUser, usersController.addUser);
router.get('/:id', validateUserId, usersController.getUser);
router.patch('/:id', verifyRequestOrigin, validateUserId, validateUpdateUser, usersController.editUser);
router.post('/:id/block', verifyRequestOrigin, validateUserId, usersController.blockUser);
router.post('/:id/unblock', verifyRequestOrigin, validateUserId, usersController.unblockUser);

module.exports = router;
