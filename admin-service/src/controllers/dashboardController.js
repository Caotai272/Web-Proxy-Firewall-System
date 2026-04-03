const dashboardService = require('../services/dashboardService');

function setFlash(req, type, message) {
  if (!req.session) {
    return;
  }

  if (type === 'error') {
    req.session.flashError = message;
    return;
  }

  req.session.flashSuccess = message;
}

function redirectWithSession(req, res, location, next) {
  if (!req.session) {
    res.redirect(location);
    return;
  }

  req.session.save((error) => {
    if (error) {
      next(error);
      return;
    }

    res.redirect(location);
  });
}

function buildHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseEntityId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw buildHttpError(400, 'Invalid id.');
  }

  return id;
}

function normalizeDomainTarget(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return '';
  }

  const candidate = raw.includes('://') ? raw : `https://${raw}`;

  try {
    const parsed = new URL(candidate);
    let hostname = parsed.hostname.toLowerCase();

    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    return hostname;
  } catch (error) {
    let normalized = raw
      .replace(/^[a-z]+:\/\//i, '')
      .replace(/[/?#].*$/, '')
      .replace(/:\d+$/, '')
      .replace(/\.+$/, '')
      .trim();

    if (normalized.startsWith('www.')) {
      normalized = normalized.slice(4);
    }

    return normalized;
  }
}

function normalizeRulePayload(body = {}, { partial = false, currentType = null } = {}) {
  const payload = {};

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'type')) {
    const type = String(body.type || '').trim();
    if (!['domain', 'url_pattern'].includes(type)) {
      throw buildHttpError(400, 'Rule type is invalid.');
    }
    payload.type = type;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'target')) {
    const rawTarget = String(body.target || '').trim();
    const targetType = payload.type || body.type || currentType;
    const target = targetType === 'domain'
      ? normalizeDomainTarget(rawTarget)
      : rawTarget.toLowerCase();
    if (!target) {
      throw buildHttpError(400, 'Rule target is required.');
    }
    payload.target = target;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'action')) {
    const action = String(body.action || '').trim();
    if (!['allow', 'block'].includes(action)) {
      throw buildHttpError(400, 'Rule action is invalid.');
    }
    payload.action = action;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'description')) {
    payload.description = String(body.description || '').trim();
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'priority')) {
    const priority = Number(body.priority);
    if (!Number.isFinite(priority) || priority < 1) {
      throw buildHttpError(400, 'Priority must be a positive number.');
    }
    payload.priority = priority;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'scope_type')) {
    const scopeType = String(body.scope_type || 'global').trim();
    if (!['global', 'request_domain', 'client_ip'].includes(scopeType)) {
      throw buildHttpError(400, 'Scope type is invalid.');
    }
    payload.scopeType = scopeType;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'scope_value')) {
    payload.scopeValue = String(body.scope_value || '').trim().toLowerCase();
  }

  if (Object.prototype.hasOwnProperty.call(body, 'is_active')) {
    if (typeof body.is_active === 'boolean') {
      payload.isActive = body.is_active;
    } else if (body.is_active === 'true' || body.is_active === 'false') {
      payload.isActive = body.is_active === 'true';
    } else {
      throw buildHttpError(400, 'is_active must be a boolean.');
    }
  }

  return payload;
}

function normalizeKeywordPayload(body = {}, { partial = false } = {}) {
  const payload = {};

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'keyword')) {
    const keyword = String(body.keyword || '').trim().toLowerCase();
    if (!keyword) {
      throw buildHttpError(400, 'Keyword is required.');
    }
    payload.keyword = keyword;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'description')) {
    payload.description = String(body.description || '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, 'is_active')) {
    if (typeof body.is_active === 'boolean') {
      payload.isActive = body.is_active;
    } else if (body.is_active === 'true' || body.is_active === 'false') {
      payload.isActive = body.is_active === 'true';
    } else {
      throw buildHttpError(400, 'is_active must be a boolean.');
    }
  }

  return payload;
}

function normalizeExtensionPayload(body = {}, { partial = false } = {}) {
  const payload = {};

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'extension')) {
    const rawExtension = String(body.extension || '').trim().toLowerCase();
    const extension = rawExtension.startsWith('.') ? rawExtension : `.${rawExtension}`;
    if (!rawExtension || extension === '.') {
      throw buildHttpError(400, 'Extension is required.');
    }
    payload.extension = extension;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'description')) {
    payload.description = String(body.description || '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, 'is_active')) {
    if (typeof body.is_active === 'boolean') {
      payload.isActive = body.is_active;
    } else if (body.is_active === 'true' || body.is_active === 'false') {
      payload.isActive = body.is_active === 'true';
    } else {
      throw buildHttpError(400, 'is_active must be a boolean.');
    }
  }

  return payload;
}

async function health(req, res) {
  try {
    const stats = await dashboardService.getStats();
    res.json({
      service: process.env.SERVICE_NAME || 'admin-service',
      status: 'ok',
      stats
    });
  } catch (error) {
    res.status(500).json({
      service: process.env.SERVICE_NAME || 'admin-service',
      status: 'error',
      message: error.message
    });
  }
}

async function renderDashboard(req, res, next) {
  try {
    const stats = await dashboardService.getStats();
    res.render('dashboard', { stats });
  } catch (error) {
    next(error);
  }
}

async function renderRules(req, res, next) {
  try {
    const rules = await dashboardService.getRules();
    res.render('rules', { rules });
  } catch (error) {
    next(error);
  }
}

async function renderKeywords(req, res, next) {
  try {
    const keywords = await dashboardService.getKeywords();
    res.render('keywords', { keywords });
  } catch (error) {
    next(error);
  }
}

async function renderExtensions(req, res, next) {
  try {
    const extensions = await dashboardService.getExtensions();
    res.render('extensions', { extensions });
  } catch (error) {
    next(error);
  }
}

async function renderLogs(req, res, next) {
  try {
    const filters = {
      decision: req.query.decision || '',
      method: req.query.method || '',
      domain: req.query.domain || '',
      query: req.query.query || '',
      limit: req.query.limit || '50'
    };
    const [logs, summary] = await Promise.all([
      dashboardService.getLogs(filters),
      dashboardService.getLogSummary()
    ]);
    res.render('logs', { logs, filters, summary });
  } catch (error) {
    next(error);
  }
}

function renderFilterLab(req, res) {
  res.render('filter-lab', {
    proxyBaseUrl: 'http://localhost:3000',
    adminBaseUrl: 'http://admin-service:4000'
  });
}

function renderBlockedContentDemo(req, res) {
  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Blocked Content Demo</title>
      </head>
      <body>
        <h1>Demo page</h1>
        <p>This page intentionally contains the keyword gambling to verify HTML filtering.</p>
      </body>
    </html>
  `);
}

function renderDownloadInstallerDemo(req, res) {
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="installer.exe"');
  res.send(Buffer.from('MZ demo executable payload', 'utf8'));
}

async function getDashboardStats(req, res, next) {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

async function getRules(req, res, next) {
  try {
    res.json(await dashboardService.getRules());
  } catch (error) {
    next(error);
  }
}

async function getRule(req, res, next) {
  try {
    const item = await dashboardService.getRule(parseEntityId(req.params.id));

    if (!item) {
      throw buildHttpError(404, 'Rule not found.');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function getKeywords(req, res, next) {
  try {
    res.json(await dashboardService.getKeywords());
  } catch (error) {
    next(error);
  }
}

async function getKeyword(req, res, next) {
  try {
    const item = await dashboardService.getKeyword(parseEntityId(req.params.id));

    if (!item) {
      throw buildHttpError(404, 'Keyword not found.');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function getExtensions(req, res, next) {
  try {
    res.json(await dashboardService.getExtensions());
  } catch (error) {
    next(error);
  }
}

async function getExtension(req, res, next) {
  try {
    const item = await dashboardService.getExtension(parseEntityId(req.params.id));

    if (!item) {
      throw buildHttpError(404, 'Extension not found.');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function getLogs(req, res, next) {
  try {
    const filters = {
      decision: req.query.decision || '',
      method: req.query.method || '',
      domain: req.query.domain || '',
      query: req.query.query || '',
      limit: req.query.limit || '50'
    };
    const [items, summary] = await Promise.all([
      dashboardService.getLogs(filters),
      dashboardService.getLogSummary()
    ]);
    res.json({ items, summary, filters });
  } catch (error) {
    next(error);
  }
}

async function getLogSummary(req, res, next) {
  try {
    res.json(await dashboardService.getLogSummary());
  } catch (error) {
    next(error);
  }
}

async function createRule(req, res, next) {
  try {
    const payload = normalizeRulePayload(req.body);

    await dashboardService.createRule({
      type: payload.type,
      target: payload.target,
      action: payload.action,
      description: payload.description,
      priority: payload.priority,
      scopeType: payload.scopeType,
      scopeValue: payload.scopeValue
    });

    setFlash(req, 'success', `Rule created for ${payload.target}.`);
  } catch (error) {
    setFlash(req, 'error', error.message);
  }

  redirectWithSession(req, res, '/rules', next);
}

async function toggleRule(req, res, next) {
  try {
    const updated = await dashboardService.toggleRule(Number(req.params.id));

    if (!updated) {
      setFlash(req, 'error', 'Rule not found.');
    } else {
      setFlash(req, 'success', `Rule ${updated.is_active ? 'activated' : 'deactivated'}.`);
    }

    redirectWithSession(req, res, '/rules', next);
  } catch (error) {
    next(error);
  }
}

async function deleteRule(req, res, next) {
  try {
    const deleted = await dashboardService.deleteRule(parseEntityId(req.params.id));

    if (!deleted) {
      setFlash(req, 'error', 'Rule not found.');
    } else {
      setFlash(req, 'success', 'Rule deleted.');
    }

    redirectWithSession(req, res, '/rules', next);
  } catch (error) {
    next(error);
  }
}

async function createKeyword(req, res, next) {
  try {
    const payload = normalizeKeywordPayload(req.body);

    await dashboardService.createKeyword(payload);
    setFlash(req, 'success', `Keyword ${payload.keyword} added.`);
  } catch (error) {
    setFlash(req, 'error', error.message);
  }

  redirectWithSession(req, res, '/keywords', next);
}

async function toggleKeyword(req, res, next) {
  try {
    const updated = await dashboardService.toggleKeyword(Number(req.params.id));

    if (!updated) {
      setFlash(req, 'error', 'Keyword not found.');
    } else {
      setFlash(req, 'success', `Keyword ${updated.is_active ? 'activated' : 'deactivated'}.`);
    }

    redirectWithSession(req, res, '/keywords', next);
  } catch (error) {
    next(error);
  }
}

async function createExtension(req, res, next) {
  try {
    const payload = normalizeExtensionPayload(req.body);

    await dashboardService.createExtension(payload);
    setFlash(req, 'success', `Extension ${payload.extension} added.`);
  } catch (error) {
    setFlash(req, 'error', error.message);
  }

  redirectWithSession(req, res, '/extensions', next);
}

async function toggleExtension(req, res, next) {
  try {
    const updated = await dashboardService.toggleExtension(Number(req.params.id));

    if (!updated) {
      setFlash(req, 'error', 'Extension not found.');
    } else {
      setFlash(req, 'success', `Extension ${updated.is_active ? 'activated' : 'deactivated'}.`);
    }

    redirectWithSession(req, res, '/extensions', next);
  } catch (error) {
    next(error);
  }
}

async function createRuleApi(req, res, next) {
  try {
    const payload = normalizeRulePayload(req.body);
    const created = await dashboardService.createRule(payload);
    res.status(201).json(await dashboardService.getRule(created.id));
  } catch (error) {
    next(error);
  }
}

async function updateRuleApi(req, res, next) {
  try {
    const ruleId = parseEntityId(req.params.id);
    const current = await dashboardService.getRule(ruleId);

    if (!current) {
      throw buildHttpError(404, 'Rule not found.');
    }

    const item = await dashboardService.updateRule(
      ruleId,
      normalizeRulePayload(req.body, { partial: true, currentType: current.type })
    );

    if (!item) {
      throw buildHttpError(404, 'Rule not found.');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function toggleRuleApi(req, res, next) {
  try {
    const item = await dashboardService.toggleRule(parseEntityId(req.params.id));

    if (!item) {
      throw buildHttpError(404, 'Rule not found.');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function deleteRuleApi(req, res, next) {
  try {
    const item = await dashboardService.deleteRule(parseEntityId(req.params.id));

    if (!item) {
      throw buildHttpError(404, 'Rule not found.');
    }

    res.json({ deleted: true, id: item.id });
  } catch (error) {
    next(error);
  }
}

async function createKeywordApi(req, res, next) {
  try {
    const payload = normalizeKeywordPayload(req.body);
    const created = await dashboardService.createKeyword(payload);
    res.status(201).json(await dashboardService.getKeyword(created.id));
  } catch (error) {
    next(error);
  }
}

async function updateKeywordApi(req, res, next) {
  try {
    const item = await dashboardService.updateKeyword(
      parseEntityId(req.params.id),
      normalizeKeywordPayload(req.body, { partial: true })
    );

    if (!item) {
      throw buildHttpError(404, 'Keyword not found.');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function toggleKeywordApi(req, res, next) {
  try {
    const item = await dashboardService.toggleKeyword(parseEntityId(req.params.id));

    if (!item) {
      throw buildHttpError(404, 'Keyword not found.');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function deleteKeywordApi(req, res, next) {
  try {
    const item = await dashboardService.deleteKeyword(parseEntityId(req.params.id));

    if (!item) {
      throw buildHttpError(404, 'Keyword not found.');
    }

    res.json({ deleted: true, id: item.id });
  } catch (error) {
    next(error);
  }
}

async function createExtensionApi(req, res, next) {
  try {
    const payload = normalizeExtensionPayload(req.body);
    const created = await dashboardService.createExtension(payload);
    res.status(201).json(await dashboardService.getExtension(created.id));
  } catch (error) {
    next(error);
  }
}

async function updateExtensionApi(req, res, next) {
  try {
    const item = await dashboardService.updateExtension(
      parseEntityId(req.params.id),
      normalizeExtensionPayload(req.body, { partial: true })
    );

    if (!item) {
      throw buildHttpError(404, 'Extension not found.');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function toggleExtensionApi(req, res, next) {
  try {
    const item = await dashboardService.toggleExtension(parseEntityId(req.params.id));

    if (!item) {
      throw buildHttpError(404, 'Extension not found.');
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function deleteExtensionApi(req, res, next) {
  try {
    const item = await dashboardService.deleteExtension(parseEntityId(req.params.id));

    if (!item) {
      throw buildHttpError(404, 'Extension not found.');
    }

    res.json({ deleted: true, id: item.id });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  health,
  renderDashboard,
  renderRules,
  renderKeywords,
  renderExtensions,
  renderLogs,
  renderFilterLab,
  renderBlockedContentDemo,
  renderDownloadInstallerDemo,
  getDashboardStats,
  getRules,
  getRule,
  getKeywords,
  getKeyword,
  getExtensions,
  getExtension,
  getLogs,
  getLogSummary,
  createRule,
  createRuleApi,
  updateRuleApi,
  toggleRule,
  deleteRule,
  toggleRuleApi,
  deleteRuleApi,
  createKeyword,
  createKeywordApi,
  updateKeywordApi,
  toggleKeyword,
  toggleKeywordApi,
  deleteKeywordApi,
  createExtension,
  createExtensionApi,
  updateExtensionApi,
  toggleExtension,
  toggleExtensionApi,
  deleteExtensionApi
};
