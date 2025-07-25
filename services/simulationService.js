// services/simulationService.js
const { Case, Progress, User } = require('../models');
const { redisUtils } = require('../config/redis');
const logger = require('../utils/logger');
const { generateSessionId } = require('../utils/helpers');

const simulationService = {
  async createSimulationSession(userId, caseId) {
    try {
      // Verify case exists and is published
      const case_data = await Case.findById(caseId);
      if (!case_data || case_data.metadata.status !== 'published') {
        throw new Error('Case not found or not available');
      }

      // Generate unique session ID
      const sessionId = generateSessionId();

      // Create progress record
      const progress = new Progress({
        userId,
        caseId,
        sessionId,
        startTime: new Date(),
        totalSteps: case_data.simulationSteps.length,
        maxPossibleScore: case_data.metadata.maxScore || 100,
        status: 'started'
      });

      await progress.save();

      // Cache session data for quick access
      const sessionData = {
        sessionId,
        userId,
        caseId,
        currentStepIndex: 0,
        startTime: progress.startTime,
        totalSteps: case_data.simulationSteps.length
      };

      await redisUtils.set(`session_${sessionId}`, sessionData, 7200); // 2 hours

      // Increment case attempt count
      await Case.findByIdAndUpdate(caseId, {
        $inc: { 'metadata.attemptCount': 1 }
      });

      logger.info(`Simulation session created: ${sessionId} for user: ${userId}, case: ${caseId}`);

      return {
        sessionId,
        case: {
          id: case_data._id,
          title: case_data.title,
          description: case_data.description,
          patient: case_data.patient,
          presentation: {
            chiefComplaint: case_data.presentation.chiefComplaint,
            // Initially provide basic presentation only
          },
          metadata: {
            estimatedDuration: case_data.metadata.estimatedDuration,
            maxScore: case_data.metadata.maxScore,
            totalSteps: case_data.simulationSteps.length
          }
        }
      };

    } catch (error) {
      logger.error('Create simulation session error:', error);
      throw error;
    }
  },

  async processSimulationStep(sessionId, currentStepId, selectedOption, timeSpent = 0) {
    try {
      // Get session data
      const sessionData = await redisUtils.get(`session_${sessionId}`);
      if (!sessionData) {
        throw new Error('Session not found or expired');
      }

      // Get progress record
      const progress = await Progress.findOne({ 
        sessionId, 
        userId: sessionData.userId 
      });

      if (!progress) {
        throw new Error('Progress record not found');
      }

      // Get case data
      const case_data = await Case.findById(sessionData.caseId);
      if (!case_data) {
        throw new Error('Case not found');
      }

      // Process current step if provided
      if (currentStepId && selectedOption) {
        const currentStep = case_data.simulationSteps.find(s => s.stepId === currentStepId);
        if (!currentStep) {
          throw new Error('Step not found');
        }

        const selectedOpt = currentStep.options.find(o => o.id === selectedOption);
        if (!selectedOpt) {
          throw new Error('Option not found');
        }

        // Record step performance
        const stepPerformance = {
          stepId: currentStepId,
          selectedOption,
          isCorrect: selectedOpt.isCorrect,
          timeSpent: timeSpent || 0,
          score: selectedOpt.points || 0,
          feedback: selectedOpt.feedback || '',
          timestamp: new Date()
        };

        progress.stepPerformance.push(stepPerformance);
        progress.score += stepPerformance.score;
        progress.stepsCompleted += 1;
        progress.timeSpent += timeSpent || 0;

        // Update session data
        sessionData.currentStepIndex += 1;
        await redisUtils.set(`session_${sessionId}`, sessionData, 7200);

        await progress.save();
      }

      // Determine next step
      const completedStepIds = progress.stepPerformance.map(p => p.stepId);
      const nextStep = case_data.simulationSteps.find(step => 
        !completedStepIds.includes(step.stepId) &&
        (step.dependencies || []).every(dep => completedStepIds.includes(dep))
      );

      if (!nextStep) {
        // Simulation complete
        return await this.completeSimulation(progress, case_data);
      }

      // Return next step
      return {
        step: nextStep,
        progress: {
          stepsCompleted: progress.stepsCompleted,
          totalSteps: progress.totalSteps,
          currentScore: progress.score,
          maxScore: progress.maxPossibleScore,
          timeSpent: progress.timeSpent,
          percentageComplete: Math.round((progress.stepsCompleted / progress.totalSteps) * 100)
        }
      };

    } catch (error) {
      logger.error('Process simulation step error:', error);
      throw error;
    }
  },

  async completeSimulation(progress, case_data) {
    try {
      // Mark as completed
      progress.status = 'completed';
      progress.endTime = new Date();
      progress.percentageScore = Math.round((progress.score / progress.maxPossibleScore) * 100);
      await progress.save();

      // Update user statistics
      await User.findByIdAndUpdate(progress.userId, {
        $inc: { 
          'statistics.casesCompleted': 1,
          'statistics.totalTimeSpent': progress.timeSpent
        }
      });

      // Update case statistics
      await this.updateCaseStatistics(case_data._id, progress.percentageScore, progress.timeSpent);

      // Clean up session cache
      await redisUtils.del(`session_${progress.sessionId}`);

      // Generate completion summary
      const summary = this.generateCompletionSummary(progress, case_data);

      logger.info(`Simulation completed: ${progress.sessionId}, score: ${progress.percentageScore}%`);

      return {
        completed: true,
        summary
      };

    } catch (error) {
      logger.error('Complete simulation error:', error);
      throw error;
    }
  },

  async updateCaseStatistics(caseId, score, timeSpent) {
    try {
      const case_data = await Case.findById(caseId);
      if (!case_data) return;

      const completionCount = case_data.metadata.completionCount + 1;
      const totalScore = (case_data.metadata.averageScore * case_data.metadata.completionCount) + score;
      const totalTime = (case_data.metadata.averageTime * case_data.metadata.completionCount) + timeSpent;

      await Case.findByIdAndUpdate(caseId, {
        'metadata.completionCount': completionCount,
        'metadata.averageScore': Math.round(totalScore / completionCount),
        'metadata.averageTime': Math.round(totalTime / completionCount)
      });

    } catch (error) {
      logger.error('Update case statistics error:', error);
    }
  },

  generateCompletionSummary(progress, case_data) {
    const correctAnswers = progress.stepPerformance.filter(p => p.isCorrect).length;
    const totalAnswers = progress.stepPerformance.length;
    
    return {
      sessionId: progress.sessionId,
      caseTitle: case_data.title,
      finalScore: progress.score,
      maxScore: progress.maxPossibleScore,
      percentageScore: progress.percentageScore,
      timeSpent: progress.timeSpent,
      stepsCompleted: progress.stepsCompleted,
      totalSteps: progress.totalSteps,
      accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
      performance: this.getPerformanceLevel(progress.percentageScore),
      stepDetails: progress.stepPerformance,
      recommendations: this.generateRecommendations(progress, case_data)
    };
  },

  getPerformanceLevel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  },

  generateRecommendations(progress, case_data) {
    const recommendations = [];
    
    if (progress.percentageScore < 70) {
      recommendations.push('Review the case learning objectives');
      recommendations.push(`Study more about ${case_data.specialty}`);
    }
    
    if (progress.timeSpent > case_data.metadata.estimatedDuration * 60 * 1.5) {
      recommendations.push('Practice similar cases to improve speed');
    }
    
    const incorrectSteps = progress.stepPerformance.filter(p => !p.isCorrect);
    if (incorrectSteps.length > 0) {
      recommendations.push('Review clinical reasoning for diagnostic steps');
    }
    
    return recommendations;
  },

  async pauseSimulation(sessionId, userId) {
    try {
      await Progress.findOneAndUpdate(
        { sessionId, userId },
        { status: 'paused' }
      );
      
      return { message: 'Simulation paused successfully' };
    } catch (error) {
      logger.error('Pause simulation error:', error);
      throw error;
    }
  },

  async resumeSimulation(sessionId, userId) {
    try {
      await Progress.findOneAndUpdate(
        { sessionId, userId },
        { status: 'started' }
      );
      
      return { message: 'Simulation resumed successfully' };
    } catch (error) {
      logger.error('Resume simulation error:', error);
      throw error;
    }
  },

  async abandonSimulation(sessionId, userId) {
    try {
      await Progress.findOneAndUpdate(
        { sessionId, userId },
        { 
          status: 'abandoned',
          endTime: new Date()
        }
      );
      
      // Clean up session cache
      await redisUtils.del(`session_${sessionId}`);
      
      return { message: 'Simulation abandoned' };
    } catch (error) {
      logger.error('Abandon simulation error:', error);
      throw error;
    }
  }
};

module.exports = simulationService;