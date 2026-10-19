const { pool } = require('../../config/database');

function toPublicUser(row) {
  return {
    id: String(row.id),
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    role: row.role,
    status: row.status,
    mustChangePassword: Boolean(row.mustChangePassword),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function searchPattern(search) {
  const escaped = search.replace(/[\\%_]/g, '\\$&');
  return `%${escaped}%`;
}

async function listUsers({ page, pageSize, search, includeAllRoles }) {
  const conditions = [];
  const values = [];

  if (!includeAllRoles) {
    conditions.push("r.name = 'user' AND u.status NOT IN ('pending', 'rejected')");
  }
  if (search) {
    conditions.push(`(
      u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?
      OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?
    )`);
    const pattern = searchPattern(search);
    values.push(pattern, pattern, pattern, pattern);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     ${where}`,
    values,
  );
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.execute(
    `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName,
            u.email, r.name AS role, u.status,
            u.must_change_password AS mustChangePassword,
            u.created_at AS createdAt, u.updated_at AS updatedAt
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     ${where}
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT ? OFFSET ?`,
    [...values, pageSize, offset],
  );

  const total = Number(countRows[0].total);
  return {
    users: rows.map(toPublicUser),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function findUserById(id) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName,
            u.email, r.name AS role, u.status,
            u.must_change_password AS mustChangePassword,
            u.created_at AS createdAt, u.updated_at AS updatedAt
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? toPublicUser(rows[0]) : null;
}

async function createUser({
  firstName,
  lastName,
  email,
  passwordHash,
  role,
  actorId,
  actorRole,
  actorSessionVersion,
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Serialize account creation and role/status mutations against the invariant lock.
    const [guardRows] = await connection.execute(
      `SELECT id FROM roles WHERE name = 'superadmin' FOR UPDATE`,
    );
    if (!guardRows[0]) {
      throw new Error('The Superadmin role is missing from the database.');
    }
    const [actors] = await connection.execute(
      `SELECT u.status, u.session_version AS sessionVersion, r.name AS role
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1
       FOR UPDATE`,
      [actorId],
    );
    if (!actors[0] || actors[0].status !== 'active' || actors[0].role !== actorRole
      || String(actors[0].sessionVersion) !== String(actorSessionVersion)) {
      await connection.rollback();
      return { kind: 'actor_forbidden' };
    }
    const [result] = await connection.execute(
      `INSERT INTO users (
         first_name, last_name, email, password_hash, status,
         must_change_password, role_id
       )
       VALUES (?, ?, ?, ?, 'active', 1, (SELECT id FROM roles WHERE name = ?))`,
      [firstName, lastName, email, passwordHash, role],
    );
    await connection.execute(
      `INSERT INTO user_management_audit (
         actor_user_id, target_user_id, action, previous_role, new_role,
         previous_status, new_status
       )
       VALUES (?, ?, 'create', NULL, ?, NULL, 'active')`,
      [actorId, result.insertId, role],
    );
    const [users] = await connection.execute(
      `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName,
              u.email, r.name AS role, u.status,
              u.must_change_password AS mustChangePassword,
              u.created_at AS createdAt, u.updated_at AS updatedAt
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [result.insertId],
    );
    if (!users[0]) {
      throw new Error('The created user could not be retrieved.');
    }
    await connection.commit();
    return { kind: 'ok', user: toPublicUser(users[0]) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateUser({
  id,
  updates,
  actorId,
  actorRole,
  actorSessionVersion,
  expectedStatus,
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    // Serialize account creation and role/status mutations against the invariant lock.
    const [guardRows] = await connection.execute(
      `SELECT id FROM roles WHERE name = 'superadmin' FOR UPDATE`,
    );
    if (!guardRows[0]) {
      throw new Error('The Superadmin role is missing from the database.');
    }
    const [actors] = await connection.execute(
      `SELECT u.status, u.session_version AS sessionVersion, r.name AS role
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1
       FOR UPDATE`,
      [actorId],
    );
    if (!actors[0] || actors[0].status !== 'active' || actors[0].role !== actorRole
      || String(actors[0].sessionVersion) !== String(actorSessionVersion)) {
      await connection.rollback();
      return { kind: 'actor_forbidden' };
    }
    let activeSuperadmins = null;
    if (Object.hasOwn(updates, 'role') || Object.hasOwn(updates, 'status')) {
      [activeSuperadmins] = await connection.execute(
        `SELECT id
         FROM users
         WHERE role_id = (SELECT id FROM roles WHERE name = 'superadmin')
           AND status = 'active'
         ORDER BY id
         FOR UPDATE`,
      );
    }

    const [targets] = await connection.execute(
      `SELECT u.id, u.status, r.name AS role
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1
       FOR UPDATE`,
      [id],
    );

    if (!targets[0]) {
      await connection.rollback();
      return { kind: 'not_found' };
    }

    const target = targets[0];
    if (actorRole === 'admin'
      && (target.role !== 'user' || ['pending', 'rejected'].includes(target.status))) {
      await connection.rollback();
      return { kind: 'forbidden' };
    }
    if (expectedStatus && target.status !== expectedStatus) {
      await connection.rollback();
      return { kind: 'status_conflict' };
    }
    if (updates.role && updates.role !== target.role
      && ['pending', 'rejected'].includes(target.status)) {
      await connection.rollback();
      return { kind: 'role_conflict' };
    }

    const roleChanged = Object.hasOwn(updates, 'role') && updates.role !== target.role;
    const statusChanged = Object.hasOwn(updates, 'status') && updates.status !== target.status;
    const nextRole = updates.role || target.role;
    const nextStatus = updates.status || target.status;
    const removesActiveSuperadmin = target.role === 'superadmin'
      && target.status === 'active'
      && (nextRole !== 'superadmin' || nextStatus !== 'active');

    if (removesActiveSuperadmin) {
      if (activeSuperadmins.length <= 1) {
        await connection.rollback();
        return { kind: 'last_superadmin' };
      }
    }

    const assignments = [];
    const values = [];
    if (Object.hasOwn(updates, 'firstName')) {
      assignments.push('first_name = ?');
      values.push(updates.firstName);
    }
    if (Object.hasOwn(updates, 'lastName')) {
      assignments.push('last_name = ?');
      values.push(updates.lastName);
    }
    if (Object.hasOwn(updates, 'email')) {
      assignments.push('email = ?');
      values.push(updates.email);
    }
    if (roleChanged) {
      assignments.push('role_id = (SELECT id FROM roles WHERE name = ?)');
      values.push(updates.role);
    }
    if (statusChanged) {
      assignments.push('status = ?');
      values.push(updates.status);
    }
    if (roleChanged || statusChanged) {
      assignments.push('session_version = session_version + 1');
    }

    if (assignments.length) {
      await connection.execute(
        `UPDATE users SET ${assignments.join(', ')} WHERE id = ?`,
        [...values, id],
      );
    }
    if (roleChanged || statusChanged) {
      let action = 'account_update';
      if (roleChanged) {
        action = target.role === 'user' && updates.role === 'admin'
          ? 'promote'
          : target.role === 'admin' && updates.role === 'user'
            ? 'demote'
            : 'role_change';
      } else if (statusChanged) {
        const statusActions = {
          blocked: 'block',
          active: target.status === 'blocked' ? 'unblock' : 'enable',
          disabled: 'disable',
        };
        action = statusActions[updates.status] || 'status_change';
      }
      await connection.execute(
        `INSERT INTO user_management_audit (
           actor_user_id, target_user_id, action,
           previous_role, new_role, previous_status, new_status
         )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [actorId, id, action, target.role, nextRole, target.status, nextStatus],
      );
    }

    const [rows] = await connection.execute(
      `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName,
              u.email, r.name AS role, u.status,
              u.must_change_password AS mustChangePassword,
              u.created_at AS createdAt, u.updated_at AS updatedAt
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [id],
    );
    await connection.commit();
    return { kind: 'ok', user: toPublicUser(rows[0]) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listUsers,
  findUserById,
  createUser,
  updateUser,
};
