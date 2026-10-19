const { pool } = require('../../config/database');

async function createResetTokenForActiveUser({ email, tokenHash }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [users] = await connection.execute(
      `SELECT id, email, first_name AS firstName
       FROM users
       WHERE email = ? AND status = 'active'
       LIMIT 1
       FOR UPDATE`,
      [email],
    );

    if (!users[0]) {
      await connection.commit();
      return null;
    }

    const user = users[0];
    const [recentTokens] = await connection.execute(
      `SELECT token_hash
       FROM password_reset_tokens
      WHERE user_id = ? AND created_at > DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 MINUTE)
       LIMIT 1`,
      [user.id],
    );

    if (recentTokens[0]) {
      await connection.commit();
      return null;
    }

    await connection.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [user.id],
    );
    await connection.execute(
      `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))`,
      [tokenHash, user.id],
    );
    await connection.commit();
    return user;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findValidResetToken(tokenHash) {
  const [tokens] = await pool.execute(
    `SELECT token_hash AS tokenHash, user_id AS userId
     FROM password_reset_tokens
     WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
  );

  return tokens[0] || null;
}

async function consumeResetTokenAndUpdatePassword({ tokenHash, userId, passwordHash }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [tokens] = await connection.execute(
      `SELECT pr.user_id AS userId
       FROM password_reset_tokens pr
       INNER JOIN users u ON u.id = pr.user_id
       WHERE pr.token_hash = ?
         AND pr.user_id = ?
         AND pr.expires_at > UTC_TIMESTAMP()
         AND u.status = 'active'
       LIMIT 1
       FOR UPDATE`,
      [tokenHash, userId],
    );

    if (!tokens[0]) {
      await connection.commit();
      return false;
    }

    const [updateResult] = await connection.execute(
      `UPDATE users
       SET password_hash = ?,
           must_change_password = 0,
           session_version = session_version + 1
       WHERE id = ? AND status = 'active'`,
      [passwordHash, userId],
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [userId],
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function invalidateResetToken(tokenHash) {
  await pool.execute(
    'DELETE FROM password_reset_tokens WHERE token_hash = ?',
    [tokenHash],
  );
}

module.exports = {
  createResetTokenForActiveUser,
  findValidResetToken,
  consumeResetTokenAndUpdatePassword,
  invalidateResetToken,
};
