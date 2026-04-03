const { pool } = require('../db/client');

async function createLog(entry) {
  const query = `
    INSERT INTO access_logs (
      request_method, url, domain, client_ip, decision, matched_rule, status_code, blocked_reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `;

  const values = [
    entry.requestMethod,
    entry.url,
    entry.domain,
    entry.clientIp,
    entry.decision,
    entry.matchedRule,
    entry.statusCode,
    entry.blockedReason
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

module.exports = {
  createLog
};
