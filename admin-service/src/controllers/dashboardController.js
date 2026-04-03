const dashboardService = require('../services/dashboardService');

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
    const logs = await dashboardService.getLogs();
    res.render('logs', { logs });
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
    res.json(await dashboardService.getLogs());
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
  getLogs
};
