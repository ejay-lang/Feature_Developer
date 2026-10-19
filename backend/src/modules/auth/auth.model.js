const { pool } = require('../../config/database');

async function createUser({ firstName, lastName, email, passwordHash }) {
  const [result] = await pool.execute(
    `INSERT INTO users (first_name, last_name, email, password_hash, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [firstName, lastName, email, passwordHash],
  );

  const [users] = await pool.execute(
    `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email,
            u.status, u.created_at AS createdAt, r.name AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?`,
    [result.insertId],
  );

  if (!users[0]) {
    throw new Error('The created user could not be retrieved.');
  }

  return {
    ...users[0],
    id: String(users[0].id),
  };
}

async function findUserByEmail(email) {
  const [users] = await pool.execute(
    `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email,
            u.password_hash AS passwordHash, u.status,
            u.must_change_password AS mustChangePassword,
            u.session_version AS sessionVersion, r.name AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.email = ?
     LIMIT 1`,
    [email],
  );

  return users[0] || null;
}

async function findAuthUserById(id) {
  const [users] = await pool.execute(
    `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email,
            u.status, u.must_change_password AS mustChangePassword,
            u.session_version AS sessionVersion, r.name AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [id],
  );

  return users[0] || null;
}

async function findUserById(id) {
  const [users] = await pool.execute(
    `SELECT id, password_hash AS passwordHash, status,
            session_version AS sessionVersion
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return users[0] || null;
}

async function updatePassword(id, passwordHash, expectedSessionVersion) {
  const [result] = await pool.execute(
    `UPDATE users
     SET password_hash = ?, must_change_password = 0, session_version = session_version + 1
     WHERE id = ? AND status = 'active' AND session_version = ?`,
    [passwordHash, id, expectedSessionVersion],
  );

  return result.affectedRows === 1 ? expectedSessionVersion + 1 : null;
}

module.exports = {
  createUser,
  findUserByEmail,
  findAuthUserById,
  findUserById,
  updatePassword,
};
