const { pool } = require('../db/client');

async function listRules() {
  const result = await pool.query(
    'SELECT id, type, target, action, description, is_active, created_at FROM rules ORDER BY id ASC'
  );
  return result.rows;
}

async function listActiveRules() {
  const result = await pool.query(
    `SELECT id, type, target, action, description, is_active, created_at
     FROM rules
     WHERE is_active = TRUE
     ORDER BY id ASC`
  );
  return result.rows;
}

module.exports = {
  listRules,
  listActiveRules
};
