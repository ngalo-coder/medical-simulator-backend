// controllers/recommendationController.js
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

const recommendationController = {
  async getRecommendations(req, res) {
    try {
      const { userId } = req.params;

      // Check authorization
      if (userId !== req.user._id.toString() && !['admin', 'instructor'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      const recommendations = await aiService.generateRecommendations(userId);

      res.json(recommendations);

    } catch (error) {
      logger.error('Get recommendations error:', error);
      res.status(500).json({
        error: 'Failed to generate recommendations',
        code: 'RECOMMENDATIONS_ERROR'
      });
    }
  },

  async submitRecommendationFeedback(req, res) {
    try {
      const { userId } = req.params;
      const { caseId, helpful, reason } = req.body;

      // Check authorization
      if (userId !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Store feedback for AI improvement (implement as needed)
      logger.info(`Recommendation feedback: User ${userId}, Case ${caseId}, Helpful: ${helpful}, Reason: ${reason}`);

      res.json({
        message: 'Feedback submitted successfully'
      });

    } catch (error) {
      logger.error('Submit recommendation feedback error:', error);
      res.status(500).json({
        error: 'Failed to submit feedback',
        code: 'FEEDBACK_ERROR'
      });
    }
  }
};

module.exports = recommendationController;