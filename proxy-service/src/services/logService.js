const { createLog } = require('../repositories/logRepository');
const { recordRuleHit } = require('../repositories/ruleRepository');

async function logAccess(entry) {
  const createdLog = await createLog(entry);

  if (entry.matchedRuleId) {
    await recordRuleHit(entry.matchedRuleId);
  }

  return createdLog;
}

module.exports = {
  logAccess
};
