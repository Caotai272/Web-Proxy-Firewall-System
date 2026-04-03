const express = require('express');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/health', dashboardController.health);
router.get('/dashboard/stats', dashboardController.getDashboardStats);
router.get('/rules', dashboardController.getRules);
router.get('/keywords', dashboardController.getKeywords);
router.get('/extensions', dashboardController.getExtensions);
router.get('/logs/summary', dashboardController.getLogSummary);
router.get('/logs', dashboardController.getLogs);

module.exports = router;
