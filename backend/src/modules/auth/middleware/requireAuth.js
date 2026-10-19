const authModel = require('../auth.model');

function rejectAndDestroySession(req, next, error) {
  if (!req.session) {
    return next(error);
  }

  req.session.destroy((destroyError) => {
    next(destroyError || error);
  });
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.id) {
    const error = new Error('Authentication is required.');
    error.statusCode = 401;
    error.code = 'AUTHENTICATION_REQUIRED';
    return next(error);
  }

  authModel.findAuthUserById(req.session.user.id)
    .then((user) => {
      if (!user) {
        const error = new Error('Authentication is required.');
        error.statusCode = 401;
        error.code = 'AUTHENTICATION_REQUIRED';
        return rejectAndDestroySession(req, next, error);
      }

      if (user.status !== 'active') {
        const error = new Error('This account is not active.');
        error.statusCode = 403;
        error.code = `ACCOUNT_${user.status.toUpperCase()}`;
        return rejectAndDestroySession(req, next, error);
      }

      if (String(user.sessionVersion) !== String(req.session.user.sessionVersion)) {
        const error = new Error('Your session is no longer valid. Please sign in again.');
        error.statusCode = 401;
        error.code = 'SESSION_INVALIDATED';
        return rejectAndDestroySession(req, next, error);
      }

      req.user = {
        id: String(user.id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        status: user.status,
        role: user.role,
        mustChangePassword: Boolean(user.mustChangePassword),
        sessionVersion: user.sessionVersion,
      };

      if (req.session.user.mustChangePassword !== req.user.mustChangePassword) {
        req.session.user.mustChangePassword = req.user.mustChangePassword;
      }

      return next();
    })
    .catch(next);
}

module.exports = requireAuth;
