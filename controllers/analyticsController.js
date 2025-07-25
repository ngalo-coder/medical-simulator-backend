// controllers/analyticsController.js
const analyticsService = require('../services/analyticsService');
const aiService = require('../services/aiService');
const { User, Progress } = require('../models');
const logger = require('../utils/logger');

const analyticsController = {
  async getDashboardAnalytics(req, res) {
    try {
      const userId = req.user._id;

      const [performance, recentProgress] = await Promise.all([
        analyticsService.calculateUserPerformance(userId),
        Progress.find({ userId, status: 'completed' })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('caseId', 'title specialty difficulty')
          .lean()
      ]);

      res.json({
        overview: {
          casesCompleted: req.user.statistics.casesCompleted,
          averageScore: performance.averageScore,
          totalTimeSpent: req.user.statistics.totalTimeSpent,
          streakDays: req.user.statistics.streakDays
        },
        recentActivity: recentProgress,
        performance,
        achievements: req.user.achievements
      });

    } catch (error) {
      logger.error('Dashboard analytics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve dashboard analytics',
        code: 'ANALYTICS_ERROR'
      });
    }
  },

  async getCompetencyAssessment(req, res) {
    try {
      const { userId } = req.params;

      // Check authorization
      if (userId !== req.user._id.toString() && !['admin', 'instructor'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Get competency assessment (implement this method in aiService)
      const assessment = await aiService.generateCompetencyAssessment(userId);

      res.json(assessment);

    } catch (error) {
      logger.error('Competency assessment error:', error);
      res.status(500).json({
        error: 'Failed to generate competency assessment',
        code: 'COMPETENCY_ERROR'
      });
    }
  },

  async getPerformanceAnalytics(req, res) {
    try {
      const { userId } = req.params;
      const { timeframe = '30d' } = req.query;

      // Check authorization
      if (userId !== req.user._id.toString() && !['admin', 'instructor'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      const analytics = await analyticsService.calculateUserPerformance(userId, timeframe);

      res.json({
        timeframe,
        analytics
      });

    } catch (error) {
      logger.error('Performance analytics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve performance analytics',
        code: 'PERFORMANCE_ANALYTICS_ERROR'
      });
    }
  },

  async getCaseAnalytics(req, res) {
    try {
      const { caseId } = req.params;

      // Get case analytics (implement this method)
      const analytics = await analyticsService.calculateCaseAnalytics(caseId);

      res.json(analytics);

    } catch (error) {
      logger.error('Case analytics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve case analytics',
        code: 'CASE_ANALYTICS_ERROR'
      });
    }
  },

  async getInstitutionAnalytics(req, res) {
    try {
      const institution = req.user.profile.institution;

      if (!institution) {
        return res.status(400).json({
          error: 'Institution not specified in user profile',
          code: 'NO_INSTITUTION'
        });
      }

      const analytics = await analyticsService.calculateInstitutionMetrics(institution);

      res.json({
        institution,
        analytics
      });

    } catch (error) {
      logger.error('Institution analytics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve institution analytics',
        code: 'INSTITUTION_ANALYTICS_ERROR'
      });
    }
  },

  async generatePerformanceReport(req, res) {
    try {
      const { userId } = req.params;
      const { format = 'json', startDate, endDate } = req.query;

      // Check authorization
      if (userId !== req.user._id.toString() && !['admin', 'instructor'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Generate comprehensive report (implement this method)
      const report = await analyticsService.generatePerformanceReport(userId, { startDate, endDate });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=performance_report.csv');
        return res.send(this.convertToCSV(report));
      }

      res.json(report);

    } catch (error) {
      logger.error('Generate performance report error:', error);
      res.status(500).json({
        error: 'Failed to generate performance report',
        code: 'REPORT_ERROR'
      });
    }
  },

  convertToCSV(data) {
    // Simple CSV conversion utility
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }
};

module.exports = analyticsController;