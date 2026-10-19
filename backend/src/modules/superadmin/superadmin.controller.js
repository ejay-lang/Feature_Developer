const superadminService = require('./superadmin.service');

async function listUsers(req, res, next) {
  try {
    res.status(200).json(await superadminService.listUsers(req.dashboardQuery));
  } catch (error) {
    next(error);
  }
}

async function listPending(req, res, next) {
  try {
    res.status(200).json(await superadminService.listPending(req.dashboardQuery));
  } catch (error) {
    next(error);
  }
}

async function getSummary(req, res, next) {
  try {
    res.status(200).json({ summary: await superadminService.getSummary() });
  } catch (error) {
    next(error);
  }
}

function actionHandler(action, message) {
  return async function handleAction(req, res, next) {
    try {
      const user = await superadminService.applyAction(
        req.params.id,
        req.user,
        action,
        req.requestedRole,
      );
      res.status(200).json({ message, user });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  listUsers,
  listPending,
  getSummary,
  approve: actionHandler('approve', 'Registration approved.'),
  reject: actionHandler('reject', 'Registration rejected.'),
  promote: actionHandler('promote', 'User promoted to Admin.'),
  demote: actionHandler('demote', 'Admin demoted to User.'),
  setRole: actionHandler('set-role', 'User role updated.'),
  block: actionHandler('block', 'Account blocked.'),
  unblock: actionHandler('unblock', 'Account unblocked.'),
  disable: actionHandler('disable', 'Account disabled.'),
  enable: actionHandler('enable', 'Account enabled.'),
};
