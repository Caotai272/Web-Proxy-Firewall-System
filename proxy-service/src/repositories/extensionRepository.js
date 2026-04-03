const { pool } = require('../db/client');

async function listActiveExtensions() {
  const result = await pool.query(
    `SELECT id, extension, description
     FROM blocked_extensions
     WHERE is_active = TRUE
     ORDER BY id ASC`
  );
  return result.rows;
}

module.exports = {
  listActiveExtensions
};
