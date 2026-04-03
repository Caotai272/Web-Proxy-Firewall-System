const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireViewer, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/health', dashboardController.health);
router.get('/dashboard/stats', requireViewer, dashboardController.getDashboardStats);
router.get('/rules', requireAdmin, dashboardController.getRules);
router.get('/rules/:id', requireAdmin, dashboardController.getRule);
router.post('/rules', requireAdmin, dashboardController.createRuleApi);
router.patch('/rules/:id', requireAdmin, dashboardController.updateRuleApi);
router.patch('/rules/:id/toggle', requireAdmin, dashboardController.toggleRuleApi);
router.delete('/rules/:id', requireAdmin, dashboardController.deleteRuleApi);
router.get('/keywords', requireAdmin, dashboardController.getKeywords);
router.get('/keywords/:id', requireAdmin, dashboardController.getKeyword);
router.post('/keywords', requireAdmin, dashboardController.createKeywordApi);
router.patch('/keywords/:id', requireAdmin, dashboardController.updateKeywordApi);
router.patch('/keywords/:id/toggle', requireAdmin, dashboardController.toggleKeywordApi);
router.delete('/keywords/:id', requireAdmin, dashboardController.deleteKeywordApi);
router.get('/extensions', requireAdmin, dashboardController.getExtensions);
router.get('/extensions/:id', requireAdmin, dashboardController.getExtension);
router.post('/extensions', requireAdmin, dashboardController.createExtensionApi);
router.patch('/extensions/:id', requireAdmin, dashboardController.updateExtensionApi);
router.patch('/extensions/:id/toggle', requireAdmin, dashboardController.toggleExtensionApi);
router.delete('/extensions/:id', requireAdmin, dashboardController.deleteExtensionApi);
router.get('/logs/summary', requireViewer, dashboardController.getLogSummary);
router.get('/logs', requireViewer, dashboardController.getLogs);

module.exports = router;
