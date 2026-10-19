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

async function listUsers({ page, pageSize, search, status, role }) {
  const conditions = [];
  const values = [];
  if (status) {
    conditions.push('u.status = ?');
    values.push(status);
  }
  if (role) {
    conditions.push('r.name = ?');
    values.push(role);
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
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

async function getSummary() {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS totalUsers,
            COALESCE(SUM(u.status = 'pending'), 0) AS pendingUsers,
            COALESCE(SUM(u.status = 'active'), 0) AS activeUsers,
            COALESCE(SUM(u.status = 'blocked'), 0) AS blockedUsers,
            COALESCE(SUM(u.status = 'disabled'), 0) AS disabledUsers,
            COALESCE(SUM(r.name = 'admin' AND u.status = 'active'), 0) AS activeAdmins,
            COALESCE(SUM(r.name = 'superadmin' AND u.status = 'active'), 0) AS activeSuperadmins
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id`,
  );
  return Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]),
  );
}

async function applyAction({
  id,
  actorId,
  actorRole,
  actorSessionVersion,
  action,
  requestedRole,
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // This role row is the mutex shared with user-management mutations.
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
      || actorRole !== 'superadmin'
      || String(actors[0].sessionVersion) !== String(actorSessionVersion)) {
      await connection.rollback();
      return { kind: 'actor_forbidden' };
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
    let nextRole = target.role;
    let nextStatus = target.status;
    if (action === 'approve' && target.status === 'pending') {
      nextStatus = 'active';
    } else if (action === 'reject' && target.status === 'pending') {
      nextStatus = 'rejected';
    } else if (action === 'promote' && target.role === 'user'
      && !['pending', 'rejected'].includes(target.status)) {
      nextRole = 'admin';
    } else if (action === 'demote' && target.role === 'admin'
      && !['pending', 'rejected'].includes(target.status)) {
      nextRole = 'user';
    } else if (action === 'set-role' && ['user', 'admin'].includes(target.role)
      && requestedRole !== target.role
      && !['pending', 'rejected'].includes(target.status)) {
      nextRole = requestedRole;
    } else if (action === 'block' && target.status === 'active') {
      nextStatus = 'blocked';
    } else if (action === 'unblock' && target.status === 'blocked') {
      nextStatus = 'active';
    } else if (action === 'disable' && target.status === 'active') {
      nextStatus = 'disabled';
    } else if (action === 'enable' && target.status === 'disabled') {
      nextStatus = 'active';
    } else {
      await connection.rollback();
      return { kind: 'invalid_transition' };
    }

    if (target.role === 'superadmin' && target.status === 'active'
      && (nextRole !== 'superadmin' || nextStatus !== 'active')) {
      const [activeRows] = await connection.execute(
        `SELECT COUNT(*) AS total
         FROM users
         WHERE role_id = (SELECT id FROM roles WHERE name = 'superadmin')
           AND status = 'active'`,
      );
      if (Number(activeRows[0].total) <= 1) {
        await connection.rollback();
        return { kind: 'last_active_superadmin' };
      }
    }

    if (nextRole !== target.role || nextStatus !== target.status) {
      await connection.execute(
        `UPDATE users
         SET role_id = (SELECT id FROM roles WHERE name = ?),
             status = ?,
             session_version = session_version + 1
         WHERE id = ?`,
        [nextRole, nextStatus, id],
      );
    }
    await connection.execute(
      `INSERT INTO user_management_audit (
         actor_user_id, target_user_id, action,
         previous_role, new_role, previous_status, new_status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [actorId, id, action, target.role, nextRole, target.status, nextStatus],
    );
    const [updatedRows] = await connection.execute(
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
    return { kind: 'ok', user: toPublicUser(updatedRows[0]) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { listUsers, getSummary, applyAction };
