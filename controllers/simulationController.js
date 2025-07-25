// controllers/simulationController.js
const simulationService = require('../services/simulationService');
const { Progress } = require('../models');
const logger = require('../utils/logger');

const simulationController = {
  async startSimulation(req, res) {
    try {
      const { caseId } = req.params;
      const userId = req.user._id;

      const session = await simulationService.createSimulationSession(userId, caseId);
      
      res.json({
        message: 'Simulation session started successfully',
        ...session
      });

    } catch (error) {
      logger.error('Start simulation error:', error);
      res.status(500).json({
        error: error.message || 'Failed to start simulation',
        code: 'SIMULATION_START_ERROR'
      });
    }
  },

  async processStep(req, res) {
    try {
      const { sessionId } = req.params;
      const { currentStepId, selectedOption, timeSpent } = req.body;

      const result = await simulationService.processSimulationStep(
        sessionId, 
        currentStepId, 
        selectedOption, 
        timeSpent
      );

      res.json(result);

    } catch (error) {
      logger.error('Process simulation step error:', error);
      res.status(500).json({
        error: error.message || 'Failed to process simulation step',
        code: 'SIMULATION_STEP_ERROR'
      });
    }
  },

  async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;

      const progress = await Progress.findOne({ sessionId, userId })
        .populate('caseId', 'title description metadata.estimatedDuration metadata.maxScore');

      if (!progress) {
        return res.status(404).json({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      res.json({
        session: progress,
        progress: {
          stepsCompleted: progress.stepsCompleted,
          totalSteps: progress.totalSteps,
          currentScore: progress.score,
          timeSpent: progress.timeSpent,
          status: progress.status
        }
      });

    } catch (error) {
      logger.error('Get session error:', error);
      res.status(500).json({
        error: 'Failed to retrieve session',
        code: 'SESSION_FETCH_ERROR'
      });
    }
  },

  async pauseSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;

      const result = await simulationService.pauseSimulation(sessionId, userId);
      res.json(result);

    } catch (error) {
      logger.error('Pause session error:', error);
      res.status(500).json({
        error: 'Failed to pause session',
        code: 'SESSION_PAUSE_ERROR'
      });
    }
  },

  async resumeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;

      const result = await simulationService.resumeSimulation(sessionId, userId);
      res.json(result);

    } catch (error) {
      logger.error('Resume session error:', error);
      res.status(500).json({
        error: 'Failed to resume session',
        code: 'SESSION_RESUME_ERROR'
      });
    }
  },

  async abandonSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;

      const result = await simulationService.abandonSimulation(sessionId, userId);
      res.json(result);

    } catch (error) {
      logger.error('Abandon session error:', error);
      res.status(500).json({
        error: 'Failed to abandon session',
        code: 'SESSION_ABANDON_ERROR'
      });
    }
  },

  async submitFeedback(req, res) {
    try {
      const { sessionId } = req.params;
      const { rating, difficulty, comments, wouldRecommend } = req.body;
      const userId = req.user._id;

      const progress = await Progress.findOneAndUpdate(
        { sessionId, userId },
        {
          userFeedback: {
            rating,
            difficulty,
            comments,
            wouldRecommend
          }
        },
        { new: true }
      );

      if (!progress) {
        return res.status(404).json({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      res.json({
        message: 'Feedback submitted successfully',
        feedback: progress.userFeedback
      });

    } catch (error) {
      logger.error('Submit feedback error:', error);
      res.status(500).json({
        error: 'Failed to submit feedback',
        code: 'FEEDBACK_ERROR'
      });
    }
  }
};

module.exports = simulationController;