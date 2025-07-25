const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/dashboard', authenticateToken, analyticsController.getUserDashboard);
router.get('/performance', authenticateToken, analyticsController.getUserPerformance);
router.get('/case/:caseId', authenticateToken, analyticsController.getCaseAnalytics);

module.exports = router;