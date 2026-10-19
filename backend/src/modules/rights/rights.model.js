const { pool } = require('../../config/database');

const MODULES = [
  { key: 'customer', name: 'Customer' },
  { key: 'product', name: 'Product' },
  { key: 'human_resources', name: 'Human Resources' },
  { key: 'sales', name: 'Sales' },
  { key: 'reports', name: 'Reports' },
];
const ACTIONS = ['view', 'create', 'edit', 'delete'];

function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function withAuthorizedTarget(actor, targetId, operation) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [roleRows] = await connection.execute(
      `SELECT id FROM roles WHERE name = 'superadmin' FOR UPDATE`,
    );
    if (!roleRows[0]) {
      throw new Error('The Superadmin role is missing from the database.');
    }
    const [actorRows] = await connection.execute(
      `SELECT u.status, u.session_version AS sessionVersion, r.name AS role
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1
       FOR UPDATE`,
      [actor.id],
    );
    const currentActor = actorRows[0];
    if (!currentActor || currentActor.status !== 'active'
      || currentActor.role !== actor.role
      || String(currentActor.sessionVersion) !== String(actor.sessionVersion)
      || !['admin', 'superadmin'].includes(currentActor.role)) {
      await connection.rollback();
      throw createHttpError(403, 'FORBIDDEN', 'Your account is no longer authorized to manage rights.');
    }

    const [targetRows] = await connection.execute(
      `SELECT u.id, u.status, r.name AS role
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1
       FOR UPDATE`,
      [targetId],
    );
    const target = targetRows[0];
    if (!target) {
      await connection.rollback();
      throw createHttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    if (currentActor.role === 'admin'
      && (target.role !== 'user' || ['pending', 'rejected'].includes(target.status))) {
      await connection.rollback();
      throw createHttpError(403, 'FORBIDDEN', 'Admins may manage permissions for regular accounts only.');
    }

    const result = await operation(connection, target);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function listCatalog() {
  const [rows] = await pool.execute(
    `SELECT id, module_key AS moduleKey, module_name AS moduleName,
            action_name AS action, permission_code AS code
     FROM permissions
     ORDER BY FIELD(module_key, 'customer', 'product', 'human_resources', 'sales', 'reports'),
              FIELD(action_name, 'view', 'create', 'edit', 'delete')`,
  );
  return {
    modules: MODULES.map((module) => ({
      ...module,
      permissions: rows
        .filter((permission) => permission.moduleKey === module.key)
        .map((permission) => ({
          id: Number(permission.id),
          action: permission.action,
          code: permission.code,
        })),
    })),
    actions: ACTIONS,
  };
}

async function getUserPermissions(actor, targetId) {
  return withAuthorizedTarget(actor, targetId, async (connection, target) => {
    const [rows] = await connection.execute(
      `SELECT p.id, p.module_key AS moduleKey, p.module_name AS moduleName,
              p.action_name AS action, p.permission_code AS code
       FROM user_permissions up
       INNER JOIN permissions p ON p.id = up.permission_id
       WHERE up.user_id = ?
       ORDER BY FIELD(p.module_key, 'customer', 'product', 'human_resources', 'sales', 'reports'),
                FIELD(p.action_name, 'view', 'create', 'edit', 'delete')`,
      [targetId],
    );
    return {
      user: { id: String(target.id), role: target.role, status: target.status },
      permissions: rows.map((row) => ({
        id: Number(row.id),
        module: row.moduleName,
        action: row.action,
        code: row.code,
      })),
    };
  });
}

async function getUserAudit(actor, targetId) {
  return withAuthorizedTarget(actor, targetId, async (connection, target) => {
    const [rows] = await connection.execute(
      `SELECT id, actor_user_id AS actorUserId, event_type AS eventType,
              before_permissions AS beforePermissions,
              after_permissions AS afterPermissions,
              created_at AS createdAt
       FROM audit_log
       WHERE target_user_id = ?
       ORDER BY id DESC
       LIMIT 50`,
      [targetId],
    );
    return {
      user: { id: String(target.id), role: target.role, status: target.status },
      auditLog: rows.map((row) => ({
        id: String(row.id),
        actorUserId: row.actorUserId === null ? null : String(row.actorUserId),
        eventType: row.eventType,
        beforePermissions: typeof row.beforePermissions === 'string'
          ? JSON.parse(row.beforePermissions)
          : row.beforePermissions,
        afterPermissions: typeof row.afterPermissions === 'string'
          ? JSON.parse(row.afterPermissions)
          : row.afterPermissions,
        createdAt: row.createdAt,
      })),
    };
  });
}

async function replaceUserPermissions(actor, targetId, permissionCodes) {
  return withAuthorizedTarget(actor, targetId, async (connection, target) => {
    const [catalogRows] = await connection.execute(
      `SELECT id, permission_code AS code
       FROM permissions
       ORDER BY permission_code`,
    );
    if (catalogRows.length !== MODULES.length * ACTIONS.length) {
      throw new Error('The permission catalog is incomplete; rights were not changed.');
    }
    const permissionByCode = new Map(catalogRows.map((permission) => [permission.code, permission]));
    const unknown = permissionCodes.filter((code) => !permissionByCode.has(code));
    if (unknown.length) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'One or more permission codes are not in the permission catalog.');
    }

    const [currentRows] = await connection.execute(
      `SELECT p.permission_code AS code
       FROM user_permissions up
       INNER JOIN permissions p ON p.id = up.permission_id
       WHERE up.user_id = ?
       ORDER BY p.permission_code`,
      [targetId],
    );
    const before = currentRows.map((row) => row.code);
    const after = [...permissionCodes].sort();
    const unchanged = before.length === after.length
      && before.every((code, index) => code === after[index]);
    if (unchanged) {
      return {
        user: { id: String(target.id), role: target.role, status: target.status },
        permissions: after,
        changed: false,
      };
    }

    await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [targetId]);
    if (after.length) {
      const placeholders = after.map(() => '(?, ?, ?)').join(', ');
      const values = after.flatMap((code) => [
        targetId,
        permissionByCode.get(code).id,
        actor.id,
      ]);
      await connection.execute(
        `INSERT INTO user_permissions (user_id, permission_id, granted_by) VALUES ${placeholders}`,
        values,
      );
    }
    await connection.execute(
      `INSERT INTO audit_log (
         actor_user_id, target_user_id, event_type,
         before_permissions, after_permissions
       )
       VALUES (?, ?, 'user.permissions.updated', ?, ?)`,
      [actor.id, targetId, JSON.stringify(before), JSON.stringify(after)],
    );
    return {
      user: { id: String(target.id), role: target.role, status: target.status },
      permissions: after,
      changed: true,
    };
  });
}

module.exports = {
  listCatalog,
  getUserPermissions,
  getUserAudit,
  replaceUserPermissions,
};
