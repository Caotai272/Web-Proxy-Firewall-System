const { query } = require('../db/client');

async function countExtensions() {
  const result = await query('SELECT COUNT(*)::int AS count FROM blocked_extensions');
  return result.rows[0].count;
}

async function listExtensions() {
  const result = await query(
    'SELECT id, extension, description, is_active, created_at FROM blocked_extensions ORDER BY id ASC'
  );
  return result.rows;
}

async function createExtension({ extension, description }) {
  const result = await query(
    `INSERT INTO blocked_extensions (extension, description)
     VALUES ($1, $2)
     RETURNING id`,
    [extension, description || null]
  );

  return result.rows[0];
}

async function toggleExtension(id) {
  const result = await query(
    `UPDATE blocked_extensions
     SET is_active = NOT is_active
     WHERE id = $1
     RETURNING id, is_active`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  countExtensions,
  listExtensions,
  createExtension,
  toggleExtension
};
