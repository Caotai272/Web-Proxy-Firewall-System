const { query } = require('../db/client');

const baseRuleSelect = `SELECT
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
 FROM rules`;

async function countRules() {
  const result = await query('SELECT COUNT(*)::int AS count FROM rules');
  return result.rows[0].count;
}

async function listRules() {
  const result = await query(
    `${baseRuleSelect}
     ORDER BY priority ASC, id ASC`
  );
  return result.rows;
}

async function listTopRules(limit = 5) {
  const result = await query(
    `SELECT id, type, target, action, priority, hit_count, last_matched_at
     FROM rules
     ORDER BY hit_count DESC, priority ASC, id ASC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

async function createRule({ type, target, action, description, priority, scopeType, scopeValue }) {
  const result = await query(
    `INSERT INTO rules (type, target, action, description, priority, scope_type, scope_value)
     VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''))
     RETURNING id`,
    [type, target, action, description || null, priority, scopeType, scopeValue || '']
  );

  return result.rows[0];
}

async function getRuleById(id) {
  const result = await query(
    `${baseRuleSelect}
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateRule(id, { type, target, action, description, priority, scopeType, scopeValue, isActive }) {
  const result = await query(
    `UPDATE rules
     SET type = $2,
         target = $3,
         action = $4,
         description = $5,
         priority = $6,
         scope_type = $7,
         scope_value = NULLIF($8, ''),
         is_active = $9,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [id, type, target, action, description || null, priority, scopeType, scopeValue || '', isActive]
  );

  return result.rows[0] || null;
}

async function toggleRule(id) {
  const result = await query(
    `UPDATE rules
     SET is_active = NOT is_active,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, is_active`,
    [id]
  );

  return result.rows[0] || null;
}

async function deleteRule(id) {
  const result = await query(
    `DELETE FROM rules
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  countRules,
  listRules,
  listTopRules,
  createRule,
  getRuleById,
  updateRule,
  toggleRule,
  deleteRule
};
