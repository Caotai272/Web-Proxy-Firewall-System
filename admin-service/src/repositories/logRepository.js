const { query } = require('../db/client');

async function countLogs() {
  const result = await query('SELECT COUNT(*)::int AS count FROM access_logs');
  return result.rows[0].count;
}

function buildLogFilters(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.decision) {
    values.push(filters.decision);
    conditions.push(`decision = $${values.length}`);
  }

  if (filters.method) {
    values.push(filters.method.toUpperCase());
    conditions.push(`request_method = $${values.length}`);
  }

  if (filters.domain) {
    values.push(`%${filters.domain.toLowerCase()}%`);
    conditions.push(`LOWER(COALESCE(domain, '')) LIKE $${values.length}`);
  }

  if (filters.query) {
    values.push(`%${filters.query.toLowerCase()}%`);
    conditions.push(
      `(LOWER(url) LIKE $${values.length}
        OR LOWER(COALESCE(matched_rule, '')) LIKE $${values.length}
        OR LOWER(COALESCE(blocked_reason, '')) LIKE $${values.length})`
    );
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
}

async function listLogs(filters = {}) {
  const safeLimit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
  const { whereClause, values } = buildLogFilters(filters);
  const limitPlaceholder = `$${values.length + 1}`;
  const result = await query(
    `SELECT
        id,
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
        latency_ms,
        created_at
     FROM access_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ${limitPlaceholder}`,
    [...values, safeLimit]
  );
  return result.rows;
}

async function getLogSummary() {
  const [overviewResult, decisionResult, stageResult, domainResult, recentBlocksResult] = await Promise.all([
    query(
      `SELECT
          COUNT(*)::int AS total_logs,
          COUNT(*) FILTER (WHERE decision = 'allow')::int AS allow_logs,
          COUNT(*) FILTER (WHERE decision = 'block')::int AS block_logs,
          COUNT(*) FILTER (WHERE request_method = 'CONNECT')::int AS connect_logs,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS logs_last_24h,
          COALESCE(ROUND(AVG(latency_ms)), 0)::int AS avg_latency_ms,
          COALESCE(SUM(response_size_bytes), 0)::bigint AS total_response_bytes
       FROM access_logs`
    ),
    query(
      `SELECT decision, COUNT(*)::int AS total
       FROM access_logs
       GROUP BY decision
       ORDER BY total DESC`
    ),
    query(
      `SELECT COALESCE(rule_stage, 'unknown') AS rule_stage, COUNT(*)::int AS total
       FROM access_logs
       GROUP BY COALESCE(rule_stage, 'unknown')
       ORDER BY total DESC
       LIMIT 6`
    ),
    query(
      `SELECT domain, COUNT(*)::int AS total
       FROM access_logs
       WHERE decision = 'block' AND domain IS NOT NULL
       GROUP BY domain
       ORDER BY total DESC, domain ASC
       LIMIT 5`
    ),
    query(
      `SELECT id, created_at, request_method, domain, matched_rule, blocked_reason, status_code
       FROM access_logs
       WHERE decision = 'block'
       ORDER BY created_at DESC
       LIMIT 5`
    )
  ]);

  return {
    overview: overviewResult.rows[0],
    byDecision: decisionResult.rows,
    byRuleStage: stageResult.rows,
    topBlockedDomains: domainResult.rows,
    recentBlocked: recentBlocksResult.rows
  };
}

module.exports = {
  countLogs,
  listLogs,
  getLogSummary
};
