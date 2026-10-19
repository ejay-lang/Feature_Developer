const { pool } = require('../../../config/database');

const MODULES = new Set(['customer', 'product', 'human_resources', 'sales', 'reports']);
const ACTIONS = new Set(['view', 'create', 'edit', 'delete']);

function requirePermission(moduleKey, action) {
  if (!MODULES.has(moduleKey) || !ACTIONS.has(action)) {
    throw new Error(`Unknown permission: ${moduleKey}.${action}`);
  }

  return async function permissionAuthorization(req, res, next) {
    if (!req.user) {
      const error = new Error('Authentication is required.');
      error.statusCode = 401;
      error.code = 'AUTHENTICATION_REQUIRED';
      return next(error);
    }
    if (req.user.role === 'superadmin') {
      return next();
    }

    try {
      const [rows] = await pool.execute(
        `SELECT 1
         FROM user_permissions up
         INNER JOIN permissions p ON p.id = up.permission_id
         INNER JOIN users u ON u.id = up.user_id
         WHERE up.user_id = ?
           AND u.status = 'active'
           AND p.module_key = ?
           AND p.action_name = ?
         LIMIT 1`,
        [req.user.id, moduleKey, action],
      );
      if (!rows.length) {
        const error = new Error('You do not have permission to perform this action.');
        error.statusCode = 403;
        error.code = 'PERMISSION_REQUIRED';
        return next(error);
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = requirePermission;
