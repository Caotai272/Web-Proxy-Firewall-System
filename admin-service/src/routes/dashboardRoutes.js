const express = require('express');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const { requireViewer, requireAdmin, redirectIfAuthenticated } = require('../middlewares/auth');

const router = express.Router();

router.get('/', (req, res) => res.redirect(req.session && req.session.user ? '/dashboard' : '/login'));
router.get('/login', redirectIfAuthenticated, authController.renderLogin);
router.post('/login', redirectIfAuthenticated, authController.login);
router.post('/logout', requireViewer, authController.logout);
router.get('/dashboard', requireViewer, dashboardController.renderDashboard);
router.get('/rules', requireAdmin, dashboardController.renderRules);
router.post('/rules', requireAdmin, dashboardController.createRule);
router.post('/rules/:id/toggle', requireAdmin, dashboardController.toggleRule);
router.get('/keywords', requireAdmin, dashboardController.renderKeywords);
router.post('/keywords', requireAdmin, dashboardController.createKeyword);
router.post('/keywords/:id/toggle', requireAdmin, dashboardController.toggleKeyword);
router.get('/extensions', requireAdmin, dashboardController.renderExtensions);
router.post('/extensions', requireAdmin, dashboardController.createExtension);
router.post('/extensions/:id/toggle', requireAdmin, dashboardController.toggleExtension);
router.get('/logs', requireViewer, dashboardController.renderLogs);
router.get('/filter-lab', requireViewer, dashboardController.renderFilterLab);
router.get('/demo/blocked-content', dashboardController.renderBlockedContentDemo);
router.get('/demo/download-installer', dashboardController.renderDownloadInstallerDemo);

module.exports = router;
