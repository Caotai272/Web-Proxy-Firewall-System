const ruleRepository = require('../repositories/ruleRepository');
const keywordRepository = require('../repositories/keywordRepository');
const extensionRepository = require('../repositories/extensionRepository');
const logRepository = require('../repositories/logRepository');

async function getStats() {
  const [rules, keywords, extensions, logs] = await Promise.all([
    ruleRepository.countRules(),
    keywordRepository.countKeywords(),
    extensionRepository.countExtensions(),
    logRepository.countLogs()
  ]);

  return {
    rules,
    keywords,
    extensions,
    logs
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

async function getLogs() {
  return logRepository.listLogs();
}

module.exports = {
  getStats,
  getRules,
  getKeywords,
  getExtensions,
  getLogs
};
