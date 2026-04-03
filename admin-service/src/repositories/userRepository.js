const { query } = require('../db/client');

async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, email, password_hash, role, display_name, is_active, last_login_at, created_at, updated_at
     FROM admin_users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
}

async function createUser({ email, passwordHash, role, displayName }) {
  const result = await query(
    `INSERT INTO admin_users (email, password_hash, role, display_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, display_name, is_active`,
    [email, passwordHash, role, displayName]
  );

  return result.rows[0];
}

async function updateLastLogin(userId) {
  await query(
    `UPDATE admin_users
     SET last_login_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

module.exports = {
  findUserByEmail,
  createUser,
  updateLastLogin
};
