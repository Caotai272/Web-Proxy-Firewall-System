const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireViewer, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/health', dashboardController.health);
router.get('/dashboard/stats', requireViewer, dashboardController.getDashboardStats);
router.get('/rules', requireAdmin, dashboardController.getRules);
router.get('/keywords', requireAdmin, dashboardController.getKeywords);
router.get('/extensions', requireAdmin, dashboardController.getExtensions);
router.get('/logs/summary', requireViewer, dashboardController.getLogSummary);
router.get('/logs', requireViewer, dashboardController.getLogs);

module.exports = router;
