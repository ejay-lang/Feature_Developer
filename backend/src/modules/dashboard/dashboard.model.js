const { pool } = require('../../config/database');

async function listViewableModuleKeys(userId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT p.module_key AS moduleKey
     FROM user_permissions up
     INNER JOIN permissions p ON p.id = up.permission_id
     INNER JOIN users u ON u.id = up.user_id
     WHERE up.user_id = ?
       AND u.status = 'active'
       AND p.action_name = 'view'`,
    [userId],
  );
  return rows.map((row) => row.moduleKey);
}

module.exports = { listViewableModuleKeys };
