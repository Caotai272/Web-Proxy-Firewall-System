const ruleRepository = require('../repositories/ruleRepository');
const keywordRepository = require('../repositories/keywordRepository');
const extensionRepository = require('../repositories/extensionRepository');
const logRepository = require('../repositories/logRepository');

async function getStats() {
  const [rules, keywords, extensions, logs, logSummary] = await Promise.all([
    ruleRepository.countRules(),
    keywordRepository.countKeywords(),
    extensionRepository.countExtensions(),
    logRepository.countLogs(),
    logRepository.getLogSummary()
  ]);

  return {
    rules,
    keywords,
    extensions,
    logs,
    logSummary
  };
}

async function getRules() {
  return ruleRepository.listRules();
}

async function getKeywords() {
  return keywordRepository.listKeywords();
}

async function getExtensions() {
  return extensionRepository.listExtensions();
}

async function getLogs(filters) {
  return logRepository.listLogs(filters);
}

async function getLogSummary() {
  return logRepository.getLogSummary();
}

module.exports = {
  getStats,
  getRules,
  getKeywords,
  getExtensions,
  getLogs,
  getLogSummary
};
