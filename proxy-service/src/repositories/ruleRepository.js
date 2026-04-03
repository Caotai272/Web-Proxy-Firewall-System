const { pool } = require('../db/client');

async function listRules() {
  const result = await pool.query(
    `SELECT
        id,
        type,
        target,
        action,
        description,
        is_active,
        priority,
        scope_type,
        scope_value,
        hit_count,
        last_matched_at,
        created_at
     FROM rules
     ORDER BY priority ASC, id ASC`
  );
  return result.rows;
}

async function listActiveRules() {
  const result = await pool.query(
    `SELECT
        id,
        type,
        target,
        action,
        description,
        is_active,
        priority,
        scope_type,
        scope_value,
        hit_count,
        last_matched_at,
        created_at
     FROM rules
     WHERE is_active = TRUE
     ORDER BY priority ASC, id ASC`
  );
  return result.rows;
}

async function recordRuleHit(ruleId) {
  await pool.query(
    `UPDATE rules
     SET hit_count = hit_count + 1,
         last_matched_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [ruleId]
  );
}

module.exports = {
  listRules,
  listActiveRules,
  recordRuleHit
};
