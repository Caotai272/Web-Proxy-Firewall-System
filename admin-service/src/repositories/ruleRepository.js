const { query } = require('../db/client');

async function countRules() {
  const result = await query('SELECT COUNT(*)::int AS count FROM rules');
  return result.rows[0].count;
}

async function listRules() {
  const result = await query(
    'SELECT id, type, target, action, description, is_active, created_at FROM rules ORDER BY id ASC'
  );
  return result.rows;
}

module.exports = {
  countRules,
  listRules
};
