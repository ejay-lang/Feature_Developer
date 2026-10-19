const VALID_STATUSES = new Set(['pending', 'active', 'blocked', 'disabled', 'rejected']);
const VALID_ROLES = new Set(['user', 'admin', 'superadmin']);

function positiveInteger(value, fallback, field, errors, maximum) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > maximum) {
    errors.push({ field, message: `${field} must be a positive integer no greater than ${maximum}.` });
    return fallback;
  }
  return Number(value);
}

function validateDashboardQuery(req, res, next) {
  const errors = [];
  const page = positiveInteger(req.query.page, 1, 'page', errors, 1000000);
  const pageSize = positiveInteger(req.query.pageSize, 20, 'pageSize', errors, 100);
  const search = req.query.search === undefined ? '' : req.query.search;
  const { status, role } = req.query;

  if (typeof search !== 'string' || [...search].length > 100) {
    errors.push({ field: 'search', message: 'Search must be a string of at most 100 characters.' });
  }
  if (status !== undefined && (typeof status !== 'string' || !VALID_STATUSES.has(status))) {
    errors.push({ field: 'status', message: 'Status must be pending, active, blocked, disabled, or rejected.' });
  }
  if (role !== undefined && (typeof role !== 'string' || !VALID_ROLES.has(role))) {
    errors.push({ field: 'role', message: 'Role must be user, admin, or superadmin.' });
  }

  if (errors.length) {
    const error = new Error('Please correct the query parameters.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = errors;
    return next(error);
  }

  req.dashboardQuery = {
    page,
    pageSize,
    search: search.trim(),
    status,
    role,
  };
  return next();
}

module.exports = validateDashboardQuery;
