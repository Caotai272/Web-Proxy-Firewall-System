const { query } = require('../db/client');

async function countKeywords() {
  const result = await query('SELECT COUNT(*)::int AS count FROM keywords');
  return result.rows[0].count;
}

async function listKeywords() {
  const result = await query(
    'SELECT id, keyword, description, is_active, created_at FROM keywords ORDER BY id ASC'
  );
  return result.rows;
}

module.exports = {
  countKeywords,
  listKeywords
};
