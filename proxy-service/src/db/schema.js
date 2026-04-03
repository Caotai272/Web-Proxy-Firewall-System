const { pool } = require('./client');

const accessLogSchemaStatements = [
  `ALTER TABLE access_logs
   ADD COLUMN IF NOT EXISTS rule_stage VARCHAR(50)`,
  `ALTER TABLE access_logs
   ADD COLUMN IF NOT EXISTS final_url TEXT`,
  `ALTER TABLE access_logs
   ADD COLUMN IF NOT EXISTS upstream_status INTEGER`,
  `ALTER TABLE access_logs
   ADD COLUMN IF NOT EXISTS content_type VARCHAR(255)`,
  `ALTER TABLE access_logs
   ADD COLUMN IF NOT EXISTS detected_extension VARCHAR(20)`,
  `ALTER TABLE access_logs
   ADD COLUMN IF NOT EXISTS response_size_bytes INTEGER`,
  `ALTER TABLE access_logs
   ADD COLUMN IF NOT EXISTS latency_ms INTEGER`,
  `CREATE INDEX IF NOT EXISTS idx_access_logs_decision ON access_logs (decision)`,
  `CREATE INDEX IF NOT EXISTS idx_access_logs_rule_stage ON access_logs (rule_stage)`,
  `CREATE INDEX IF NOT EXISTS idx_access_logs_matched_rule ON access_logs (matched_rule)`,
  `CREATE INDEX IF NOT EXISTS idx_access_logs_status_code ON access_logs (status_code)`
];

const accessLogBackfillStatements = [
  `UPDATE access_logs
   SET rule_stage = 'proxy:error',
       final_url = COALESCE(final_url, url)
   WHERE rule_stage IS NULL
     AND matched_rule = 'proxy:error'`,
  `UPDATE access_logs
   SET rule_stage = 'request:domain'
   WHERE rule_stage IS NULL
     AND (
       matched_rule LIKE 'domain:block:%'
       OR matched_rule = 'domain:blacklist'
     )`,
  `UPDATE access_logs
   SET rule_stage = 'request:url_pattern'
   WHERE rule_stage IS NULL
     AND matched_rule LIKE 'url_pattern:block:%'`,
  `UPDATE access_logs
   SET rule_stage = 'request:whitelist'
   WHERE rule_stage IS NULL
     AND request_method = 'CONNECT'
     AND (
       matched_rule LIKE 'domain:allow:%'
       OR matched_rule LIKE 'url_pattern:allow:%'
       OR matched_rule = 'domain:whitelist'
     )`,
  `UPDATE access_logs
   SET rule_stage = 'request:pass'
   WHERE rule_stage IS NULL
     AND request_method = 'CONNECT'
     AND decision = 'allow'`,
  `UPDATE access_logs
   SET detected_extension = COALESCE(
         detected_extension,
         NULLIF(regexp_replace(matched_rule, '^extension:block:', ''), '')
       ),
       rule_stage = CASE
         WHEN LOWER(split_part(split_part(url, '#', 1), '?', 1)) LIKE '%' || LOWER(NULLIF(regexp_replace(matched_rule, '^extension:block:', ''), ''))
           THEN 'request:extension'
         ELSE 'response:extension'
       END
   WHERE rule_stage IS NULL
     AND matched_rule LIKE 'extension:block:%'`,
  `UPDATE access_logs
   SET rule_stage = CASE
         WHEN position(LOWER(NULLIF(regexp_replace(matched_rule, '^keyword:block:', ''), '')) IN LOWER(url)) > 0
           THEN 'request:keyword'
         ELSE 'response:keyword'
       END
   WHERE rule_stage IS NULL
     AND matched_rule LIKE 'keyword:block:%'`,
  `UPDATE access_logs
   SET rule_stage = 'response:pass'
   WHERE rule_stage IS NULL
     AND decision = 'allow'`,
  `UPDATE access_logs
   SET upstream_status = status_code
   WHERE upstream_status IS NULL
     AND decision = 'allow'
     AND status_code IS NOT NULL`,
  `UPDATE access_logs
   SET final_url = url
   WHERE final_url IS NULL
     AND (
       decision = 'allow'
       OR request_method = 'CONNECT'
       OR matched_rule = 'proxy:error'
     )`
];

async function ensureAccessLogSchema() {
  for (const statement of accessLogSchemaStatements) {
    await pool.query(statement);
  }

  for (const statement of accessLogBackfillStatements) {
    await pool.query(statement);
  }
}

module.exports = {
  ensureAccessLogSchema
};
