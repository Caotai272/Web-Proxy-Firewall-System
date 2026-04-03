const { pool } = require('../db/client');

async function listActiveKeywords() {
  const result = await pool.query(
    `SELECT id, keyword, description
     FROM keywords
     WHERE is_active = TRUE
     ORDER BY id ASC`
  );
  return result.rows;
}

module.exports = {
  listActiveKeywords
};
