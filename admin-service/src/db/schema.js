const { query } = require('./client');

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

async function ensureAccessLogSchema() {
  for (const statement of accessLogSchemaStatements) {
    await query(statement);
  }
}

module.exports = {
  ensureAccessLogSchema
};
