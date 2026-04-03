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

module.exports = {
  countExtensions,
  listExtensions
};
