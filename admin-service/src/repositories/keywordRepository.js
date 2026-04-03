const { query } = require('../db/client');

const baseKeywordSelect = `SELECT id, keyword, description, is_active, created_at FROM keywords`;

async function countKeywords() {
  const result = await query('SELECT COUNT(*)::int AS count FROM keywords');
  return result.rows[0].count;
}

async function listKeywords() {
  const result = await query(
    `${baseKeywordSelect} ORDER BY id ASC`
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

async function getKeywordById(id) {
  const result = await query(
    `${baseKeywordSelect}
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateKeyword(id, { keyword, description, isActive }) {
  const result = await query(
    `UPDATE keywords
     SET keyword = $2,
         description = $3,
         is_active = $4
     WHERE id = $1
     RETURNING id`,
    [id, keyword, description || null, isActive]
  );

  return result.rows[0] || null;
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

async function deleteKeyword(id) {
  const result = await query(
    `DELETE FROM keywords
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  countKeywords,
  listKeywords,
  createKeyword,
  getKeywordById,
  updateKeyword,
  toggleKeyword,
  deleteKeyword
};
