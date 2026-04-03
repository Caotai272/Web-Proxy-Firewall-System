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

async function createKeyword({ keyword, description }) {
  const result = await query(
    `INSERT INTO keywords (keyword, description)
     VALUES ($1, $2)
     RETURNING id`,
    [keyword, description || null]
  );

  return result.rows[0];
}

async function toggleKeyword(id) {
  const result = await query(
    `UPDATE keywords
     SET is_active = NOT is_active
     WHERE id = $1
     RETURNING id, is_active`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  countKeywords,
  listKeywords,
  createKeyword,
  toggleKeyword
};
