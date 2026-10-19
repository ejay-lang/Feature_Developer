const bcrypt = require('bcrypt');
const usersModel = require('./users.model');

const BCRYPT_SALT_ROUNDS = 12;

function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function assertManageableUser(user, actor) {
  if (!user) {
    throw createHttpError(404, 'USER_NOT_FOUND', 'User not found.');
  }
  if (actor.role === 'admin'
    && (user.role !== 'user' || ['pending', 'rejected'].includes(user.status))) {
    throw createHttpError(403, 'FORBIDDEN', 'Admins may only manage non-pending regular user accounts.');
  }
}

async function listUsers(query, actor) {
  return usersModel.listUsers({
    ...query,
    includeAllRoles: actor.role === 'superadmin',
  });
}

async function getUser(id, actor) {
  const user = await usersModel.findUserById(id);
  assertManageableUser(user, actor);
  return user;
}

async function addUser(data, actor) {
  if (actor.role === 'admin' && data.role !== 'user') {
    throw createHttpError(403, 'FORBIDDEN', 'Admins may only create regular user accounts.');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
  try {
    const result = await usersModel.createUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      role: data.role,
      actorId: actor.id,
      actorRole: actor.role,
      actorSessionVersion: actor.sessionVersion,
    });
    return handleMutationResult(result);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw createHttpError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.');
    }
    throw error;
  }
}

async function editUser(id, updates, actor) {
  const currentUser = await usersModel.findUserById(id);
  assertManageableUser(currentUser, actor);

  if (actor.role === 'admin' && updates.role && updates.role !== 'user') {
    throw createHttpError(403, 'FORBIDDEN', 'Admins may only manage non-pending regular user accounts.');
  }
  if (String(actor.id) === String(id)
    && actor.role === 'superadmin'
    && updates.role
    && updates.role !== 'superadmin') {
    throw createHttpError(409, 'LAST_SUPERADMIN', 'You cannot remove your own Superadmin role.');
  }

  try {
    const result = await usersModel.updateUser({
      id,
      updates,
      actorId: actor.id,
      actorRole: actor.role,
      actorSessionVersion: actor.sessionVersion,
    });
    return handleMutationResult(result);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw createHttpError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.');
    }
    throw error;
  }
}

async function changeStatus(id, status, actor) {
  const currentUser = await usersModel.findUserById(id);
  assertManageableUser(currentUser, actor);

  if (currentUser.status !== (status === 'blocked' ? 'active' : 'blocked')) {
    throw createHttpError(409, 'INVALID_STATUS_TRANSITION', `Only ${status === 'blocked' ? 'active' : 'blocked'} users can be ${status}.`);
  }
  if (String(actor.id) === String(id) && status === 'blocked') {
    throw createHttpError(409, 'CANNOT_BLOCK_SELF', 'You cannot block your own account.');
  }

  const result = await usersModel.updateUser({
    id,
    updates: { status },
    actorId: actor.id,
    actorRole: actor.role,
    actorSessionVersion: actor.sessionVersion,
    expectedStatus: currentUser.status,
  });
  return handleMutationResult(result);
}

function handleMutationResult(result) {
  if (result.kind === 'actor_forbidden') {
    throw createHttpError(403, 'FORBIDDEN', 'Your account is no longer authorized to manage users.');
  }
  if (result.kind === 'not_found') {
    throw createHttpError(404, 'USER_NOT_FOUND', 'User not found.');
  }
  if (result.kind === 'forbidden') {
    throw createHttpError(403, 'FORBIDDEN', 'Admins may only manage non-pending regular user accounts.');
  }
  if (result.kind === 'last_superadmin') {
    throw createHttpError(409, 'LAST_SUPERADMIN', 'At least one active Superadmin must remain.');
  }
  if (result.kind === 'status_conflict') {
    throw createHttpError(409, 'INVALID_STATUS_TRANSITION', 'The user status changed. Refresh the list and try again.');
  }
  if (result.kind === 'role_conflict') {
    throw createHttpError(409, 'INVALID_ROLE_TRANSITION', 'Approve the registration before changing its role.');
  }
  return result.user;
}

module.exports = {
  listUsers,
  getUser,
  addUser,
  editUser,
  changeStatus,
};
