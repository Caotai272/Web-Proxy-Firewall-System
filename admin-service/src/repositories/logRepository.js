const { query } = require('../db/client');

async function countLogs() {
  const result = await query('SELECT COUNT(*)::int AS count FROM access_logs');
  return result.rows[0].count;
}

async function listLogs() {
  const result = await query(
    `SELECT id, request_method, url, domain, decision, matched_rule, status_code, blocked_reason, created_at
     FROM access_logs
     ORDER BY created_at DESC
     LIMIT 50`
  );
  return result.rows;
}

module.exports = {
  countLogs,
  listLogs
};
