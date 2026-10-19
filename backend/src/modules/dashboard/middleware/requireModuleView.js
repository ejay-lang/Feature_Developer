const requirePermission = require('../../rights/middleware/requirePermission');

const MODULE_KEYS = new Set(['customer', 'product', 'human_resources', 'sales', 'reports']);

function requireModuleView(req, res, next) {
  const { moduleKey } = req.params;
  if (!MODULE_KEYS.has(moduleKey)) {
    const error = new Error('The requested module does not exist.');
    error.statusCode = 404;
    error.code = 'MODULE_NOT_FOUND';
    return next(error);
  }

  return requirePermission(moduleKey, 'view')(req, res, next);
}

module.exports = requireModuleView;
