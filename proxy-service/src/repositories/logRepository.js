const { pool } = require('../db/client');

async function createLog(entry) {
  const query = `
    INSERT INTO access_logs (
      request_method,
      url,
      domain,
      client_ip,
      decision,
      rule_stage,
      matched_rule,
      status_code,
      upstream_status,
      blocked_reason,
      final_url,
      content_type,
      detected_extension,
      response_size_bytes,
      latency_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id
  `;

  const values = [
    entry.requestMethod,
    entry.url,
    entry.domain,
    entry.clientIp,
    entry.decision,
    entry.ruleStage,
    entry.matchedRule,
    entry.statusCode,
    entry.upstreamStatus,
    entry.blockedReason,
    entry.finalUrl,
    entry.contentType,
    entry.detectedExtension,
    entry.responseSizeBytes,
    entry.latencyMs
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

module.exports = {
  createLog
};
