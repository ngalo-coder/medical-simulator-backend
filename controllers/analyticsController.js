const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

const analyticsController = {
  async getUserDashboard(req, res) {
    try {
      const analytics = await analyticsService.getUserAnalytics(req.user._id);
      res.json(analytics);
    } catch (error) {
      logger.error('Get user dashboard error:', error);
      res.status(500).json({
        error: 'Failed to get user dashboard',
        code: 'DASHBOARD_ERROR'
      });
    }
  },

  async getUserPerformance(req, res) {
    try {
      const analytics = await analyticsService.getUserAnalytics(req.user._id);
      res.json({
        performance: analytics.performanceBySpecialty,
        overview: analytics.overview
      });
    } catch (error) {
      logger.error('Get user performance error:', error);
      res.status(500).json({
        error: 'Failed to get user performance',
        code: 'PERFORMANCE_ERROR'
      });
    }
  },

  async getCaseAnalytics(req, res) {
    try {
      const { caseId } = req.params;
      const analytics = await analyticsService.getCaseAnalytics(caseId);
      res.json(analytics);
    } catch (error) {
      logger.error('Get case analytics error:', error);
      res.status(500).json({
        error: 'Failed to get case analytics',
        code: 'CASE_ANALYTICS_ERROR'
      });
    }
  },

  async getSystemAnalytics(req, res) {
    try {
      const analytics = await analyticsService.getSystemAnalytics();
      res.json(analytics);
    } catch (error) {
      logger.error('Get system analytics error:', error);
      res.status(500).json({
        error: 'Failed to get system analytics',
        code: 'SYSTEM_ANALYTICS_ERROR'
      });
    }
  }
};

module.exports = analyticsController;