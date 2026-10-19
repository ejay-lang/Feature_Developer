function parsePositiveInteger(value, fallback, field, errors, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > maximum) {
    errors.push({ field, message: `${field} must be a positive integer no greater than ${maximum}.` });
    return fallback;
  }

  return Number(value);
}

function validateUserList(req, res, next) {
  const errors = [];
  const page = parsePositiveInteger(req.query.page, 1, 'page', errors, 1000000);
  const pageSize = parsePositiveInteger(req.query.pageSize, 20, 'pageSize', errors, 100);
  const search = req.query.search === undefined ? '' : req.query.search;

  if (typeof search !== 'string' || [...search].length > 100) {
    errors.push({ field: 'search', message: 'Search must be a string of at most 100 characters.' });
  }

  if (errors.length) {
    const error = new Error('Please correct the query parameters.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = errors;
    return next(error);
  }

  req.userListQuery = {
    page,
    pageSize,
    search: search.trim(),
  };
  return next();
}

module.exports = validateUserList;
