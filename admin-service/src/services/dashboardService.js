const ruleRepository = require('../repositories/ruleRepository');
const keywordRepository = require('../repositories/keywordRepository');
const extensionRepository = require('../repositories/extensionRepository');
const logRepository = require('../repositories/logRepository');

async function getStats() {
  const [rules, keywords, extensions, logs, logSummary, topRules] = await Promise.all([
    ruleRepository.countRules(),
    keywordRepository.countKeywords(),
    extensionRepository.countExtensions(),
    logRepository.countLogs(),
    logRepository.getLogSummary(),
    ruleRepository.listTopRules()
  ]);

  return {
    rules,
    keywords,
    extensions,
    logs,
    logSummary,
    topRules
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

function buildDuplicateError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function createRule(input) {
  try {
    return await ruleRepository.createRule(input);
  } catch (error) {
    if (error.code === '23505') {
      throw buildDuplicateError('Rule already exists.');
    }

    throw error;
  }
}

async function toggleRule(id) {
  return ruleRepository.toggleRule(id);
}

async function createKeyword(input) {
  try {
    return await keywordRepository.createKeyword(input);
  } catch (error) {
    if (error.code === '23505') {
      throw buildDuplicateError('Keyword already exists.');
    }

    throw error;
  }
}

async function toggleKeyword(id) {
  return keywordRepository.toggleKeyword(id);
}

async function createExtension(input) {
  try {
    return await extensionRepository.createExtension(input);
  } catch (error) {
    if (error.code === '23505') {
      throw buildDuplicateError('Extension already exists.');
    }

    throw error;
  }
}

async function toggleExtension(id) {
  return extensionRepository.toggleExtension(id);
}

module.exports = {
  getStats,
  getRules,
  getKeywords,
  getExtensions,
  getLogs,
  getLogSummary,
  createRule,
  toggleRule,
  createKeyword,
  toggleKeyword,
  createExtension,
  toggleExtension
};
