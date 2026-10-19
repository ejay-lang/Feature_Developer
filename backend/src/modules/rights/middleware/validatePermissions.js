const MODULE_KEYS = ['customer', 'product', 'human_resources', 'sales', 'reports'];
const ACTIONS = ['view', 'create', 'edit', 'delete'];
const VALID_CODES = new Set(
  MODULE_KEYS.flatMap((moduleKey) => ACTIONS.map((action) => `${moduleKey}.${action}`)),
);

function validatePermissions(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).length !== 1
    || !Object.hasOwn(body, 'permissions')
    || !Array.isArray(body.permissions)
    || body.permissions.length > VALID_CODES.size
    || body.permissions.some((code) => typeof code !== 'string' || !VALID_CODES.has(code))
    || new Set(body.permissions).size !== body.permissions.length) {
    const error = new Error('Permissions must be a unique array of valid module.action codes.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = [{
      field: 'permissions',
      message: `Provide up to ${VALID_CODES.size} unique permission codes from the catalog.`,
    }];
    return next(error);
  }

  req.permissionCodes = body.permissions;
  return next();
}

module.exports = validatePermissions;
