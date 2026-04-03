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

function withDuplicateHandling(handler, message) {
  return handler().catch((error) => {
    if (error.code === '23505') {
      throw buildDuplicateError(message);
    }

    throw error;
  });
}

async function createRule(input) {
  return withDuplicateHandling(() => ruleRepository.createRule(input), 'Rule already exists.');
}

async function getRule(id) {
  return ruleRepository.getRuleById(id);
}

async function updateRule(id, input) {
  const existing = await ruleRepository.getRuleById(id);
  if (!existing) {
    return null;
  }

  await withDuplicateHandling(
    () => ruleRepository.updateRule(id, {
      type: input.type ?? existing.type,
      target: input.target ?? existing.target,
      action: input.action ?? existing.action,
      description: input.description ?? existing.description,
      priority: input.priority ?? existing.priority,
      scopeType: input.scopeType ?? existing.scope_type,
      scopeValue: input.scopeValue ?? existing.scope_value,
      isActive: input.isActive ?? existing.is_active
    }),
    'Rule already exists.'
  );

  return ruleRepository.getRuleById(id);
}

async function toggleRule(id) {
  return ruleRepository.toggleRule(id);
}

async function deleteRule(id) {
  return ruleRepository.deleteRule(id);
}

async function createKeyword(input) {
  return withDuplicateHandling(() => keywordRepository.createKeyword(input), 'Keyword already exists.');
}

async function getKeyword(id) {
  return keywordRepository.getKeywordById(id);
}

async function updateKeyword(id, input) {
  const existing = await keywordRepository.getKeywordById(id);
  if (!existing) {
    return null;
  }

  await withDuplicateHandling(
    () => keywordRepository.updateKeyword(id, {
      keyword: input.keyword ?? existing.keyword,
      description: input.description ?? existing.description,
      isActive: input.isActive ?? existing.is_active
    }),
    'Keyword already exists.'
  );

  return keywordRepository.getKeywordById(id);
}

async function toggleKeyword(id) {
  return keywordRepository.toggleKeyword(id);
}

async function deleteKeyword(id) {
  return keywordRepository.deleteKeyword(id);
}

async function createExtension(input) {
  return withDuplicateHandling(() => extensionRepository.createExtension(input), 'Extension already exists.');
}

async function getExtension(id) {
  return extensionRepository.getExtensionById(id);
}

async function updateExtension(id, input) {
  const existing = await extensionRepository.getExtensionById(id);
  if (!existing) {
    return null;
  }

  await withDuplicateHandling(
    () => extensionRepository.updateExtension(id, {
      extension: input.extension ?? existing.extension,
      description: input.description ?? existing.description,
      isActive: input.isActive ?? existing.is_active
    }),
    'Extension already exists.'
  );

  return extensionRepository.getExtensionById(id);
}

async function toggleExtension(id) {
  return extensionRepository.toggleExtension(id);
}

async function deleteExtension(id) {
  return extensionRepository.deleteExtension(id);
}

module.exports = {
  getStats,
  getRules,
  getRule,
  getKeywords,
  getKeyword,
  getExtensions,
  getExtension,
  getLogs,
  getLogSummary,
  createRule,
  updateRule,
  toggleRule,
  deleteRule,
  createKeyword,
  updateKeyword,
  toggleKeyword,
  deleteKeyword,
  createExtension,
  updateExtension,
  toggleExtension,
  deleteExtension
};
