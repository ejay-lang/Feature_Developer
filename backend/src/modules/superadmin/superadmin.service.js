const superadminModel = require('./superadmin.model');

function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function listUsers(query) {
  return superadminModel.listUsers(query);
}

async function listPending(query) {
  return superadminModel.listUsers({ ...query, status: 'pending' });
}

async function getSummary() {
  return superadminModel.getSummary();
}

async function applyAction(id, actor, action, requestedRole) {
  if (String(actor.id) === String(id) && ['block', 'disable'].includes(action)) {
    throw createHttpError(409, 'CANNOT_RESTRICT_SELF', 'You cannot block or disable your own account.');
  }

  const result = await superadminModel.applyAction({
    id,
    actorId: actor.id,
    actorRole: actor.role,
    actorSessionVersion: actor.sessionVersion,
    action,
    requestedRole,
  });
  if (result.kind === 'actor_forbidden') {
    throw createHttpError(403, 'FORBIDDEN', 'Your account is no longer authorized to manage users.');
  }
  if (result.kind === 'not_found') {
    throw createHttpError(404, 'USER_NOT_FOUND', 'User not found.');
  }
  if (result.kind === 'invalid_transition') {
    throw createHttpError(409, 'INVALID_STATUS_OR_ROLE_TRANSITION', 'The user is not in a state that allows this action.');
  }
  if (result.kind === 'last_active_superadmin') {
    throw createHttpError(409, 'LAST_ACTIVE_SUPERADMIN', 'At least one active Superadmin must remain.');
  }
  return result.user;
}

module.exports = { listUsers, listPending, getSummary, applyAction };
