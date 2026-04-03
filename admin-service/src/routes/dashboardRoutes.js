const express = require('express');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/', (req, res) => res.redirect('/dashboard'));
router.get('/dashboard', dashboardController.renderDashboard);
router.get('/rules', dashboardController.renderRules);
router.get('/keywords', dashboardController.renderKeywords);
router.get('/extensions', dashboardController.renderExtensions);
router.get('/logs', dashboardController.renderLogs);
router.get('/demo/blocked-content', dashboardController.renderBlockedContentDemo);

module.exports = router;
