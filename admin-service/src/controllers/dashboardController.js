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

async function getKeywords(req, res, next) {
  try {
    res.json(await dashboardService.getKeywords());
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
    const type = String(req.body.type || '').trim();
    const target = String(req.body.target || '').trim().toLowerCase();
    const action = String(req.body.action || '').trim();
    const description = String(req.body.description || '').trim();
    const priority = Number(req.body.priority);
    const scopeType = String(req.body.scope_type || 'global').trim();
    const scopeValue = String(req.body.scope_value || '').trim().toLowerCase();

    if (!['domain', 'url_pattern'].includes(type)) {
      setFlash(req, 'error', 'Rule type is invalid.');
      redirectWithSession(req, res, '/rules', next);
      return;
    }

    if (!['allow', 'block'].includes(action)) {
      setFlash(req, 'error', 'Rule action is invalid.');
      redirectWithSession(req, res, '/rules', next);
      return;
    }

    if (!target) {
      setFlash(req, 'error', 'Rule target is required.');
      redirectWithSession(req, res, '/rules', next);
      return;
    }

    if (!['global', 'request_domain', 'client_ip'].includes(scopeType)) {
      setFlash(req, 'error', 'Scope type is invalid.');
      redirectWithSession(req, res, '/rules', next);
      return;
    }

    await dashboardService.createRule({
      type,
      target,
      action,
      description,
      priority: Number.isFinite(priority) ? priority : 100,
      scopeType,
      scopeValue
    });

    setFlash(req, 'success', `Rule created for ${target}.`);
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

async function createKeyword(req, res, next) {
  try {
    const keyword = String(req.body.keyword || '').trim().toLowerCase();
    const description = String(req.body.description || '').trim();

    if (!keyword) {
      setFlash(req, 'error', 'Keyword is required.');
      redirectWithSession(req, res, '/keywords', next);
      return;
    }

    await dashboardService.createKeyword({ keyword, description });
    setFlash(req, 'success', `Keyword ${keyword} added.`);
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
    const rawExtension = String(req.body.extension || '').trim().toLowerCase();
    const extension = rawExtension.startsWith('.') ? rawExtension : `.${rawExtension}`;
    const description = String(req.body.description || '').trim();

    if (!rawExtension || extension === '.') {
      setFlash(req, 'error', 'Extension is required.');
      redirectWithSession(req, res, '/extensions', next);
      return;
    }

    await dashboardService.createExtension({ extension, description });
    setFlash(req, 'success', `Extension ${extension} added.`);
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
