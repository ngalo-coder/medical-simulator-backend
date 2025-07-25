// services/analyticsService.js
const { User, Case, Progress, Review } = require('../models');
const logger = require('../utils/logger');
const { redisUtils } = require('../config/redis');

const analyticsService = {
  async getUserAnalytics(userId) {
    try {
      // Get user progress data
      const progressData = await Progress.find({ userId, status: 'completed' })
        .populate('caseId', 'title specialty difficulty')
        .sort({ createdAt: -1 })
        .lean();

      const user = await User.findById(userId).lean();

      // Calculate overview metrics
      const overview = {
        casesCompleted: progressData.length,
        averageScore: progressData.length > 0 ? 
          Math.round(progressData.reduce((sum, p) => sum + p.percentageScore, 0) / progressData.length) : 0,
        totalTimeSpent: progressData.reduce((sum, p) => sum + (p.timeSpent || 0), 0),
        currentStreak: user.statistics?.streakDays || 0
      };

      // Performance by specialty
      const performanceBySpecialty = {};
      progressData.forEach(progress => {
        const specialty = progress.caseId?.specialty || 'Unknown';
        if (!performanceBySpecialty[specialty]) {
          performanceBySpecialty[specialty] = {
            casesCompleted: 0,
            totalScore: 0,
            totalTime: 0
          };
        }
        performanceBySpecialty[specialty].casesCompleted++;
        performanceBySpecialty[specialty].totalScore += progress.percentageScore;
        performanceBySpecialty[specialty].totalTime += progress.timeSpent || 0;
      });

      // Calculate averages
      Object.keys(performanceBySpecialty).forEach(specialty => {
        const data = performanceBySpecialty[specialty];
        data.averageScore = Math.round(data.totalScore / data.casesCompleted);
        data.averageTime = Math.round(data.totalTime / data.casesCompleted);
        delete data.totalScore;
        delete data.totalTime;
      });

      // Recent activity (last 10 completed cases)
      const recentActivity = progressData.slice(0, 10).map(progress => ({
        caseId: progress.caseId?._id,
        caseTitle: progress.caseId?.title,
        specialty: progress.caseId?.specialty,
        difficulty: progress.caseId?.difficulty,
        score: progress.percentageScore,
        timeSpent: progress.timeSpent,
        completedAt: progress.updatedAt
      }));

      return {
        overview,
        performanceBySpecialty,
        recentActivity,
        achievements: user.achievements || []
      };

    } catch (error) {
      logger.error('Get user analytics error:', error);
      throw error;
    }
  },

  async getCaseAnalytics(caseId) {
    try {
      const progressData = await Progress.find({ caseId, status: 'completed' }).lean();
      const reviews = await Review.find({ caseId }).lean();

      const analytics = {
        totalAttempts: progressData.length,
        completionRate: progressData.length > 0 ? 100 : 0, // Simplified
        averageScore: progressData.length > 0 ?
          Math.round(progressData.reduce((sum, p) => sum + p.percentageScore, 0) / progressData.length) : 0,
        averageTime: progressData.length > 0 ?
          Math.round(progressData.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / progressData.length) : 0,
        averageRating: reviews.length > 0 ?
          Math.round(reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) : 0,
        difficultyDistribution: this.calculateDifficultyDistribution(progressData)
      };

      return analytics;

    } catch (error) {
      logger.error('Get case analytics error:', error);
      throw error;
    }
  },

  calculateDifficultyDistribution(progressData) {
    const distribution = {};
    
    progressData.forEach(progress => {
      if (progress.stepPerformance) {
        progress.stepPerformance.forEach(step => {
          if (!distribution[step.stepId]) {
            distribution[step.stepId] = {
              attempts: 0,
              correct: 0,
              totalTime: 0
            };
          }
          distribution[step.stepId].attempts++;
          if (step.isCorrect) {
            distribution[step.stepId].correct++;
          }
          distribution[step.stepId].totalTime += step.timeSpent || 0;
        });
      }
    });

    // Calculate rates and averages
    Object.keys(distribution).forEach(stepId => {
      const data = distribution[stepId];
      data.correctRate = data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0;
      data.averageTime = data.attempts > 0 ? Math.round(data.totalTime / data.attempts) : 0;
      delete data.correct;
      delete data.totalTime;
    });

    return distribution;
  },

  async getSystemAnalytics() {
    try {
      const [totalUsers, totalCases, totalSessions] = await Promise.all([
        User.countDocuments(),
        Case.countDocuments({ 'metadata.status': 'published' }),
        Progress.countDocuments()
      ]);

      const progressData = await Progress.find({ status: 'completed' })
        .populate('caseId', 'specialty')
        .lean();

      const averageSessionTime = progressData.length > 0 ?
        Math.round(progressData.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / progressData.length) : 0;

      // Popular specialties
      const specialtyCount = {};
      progressData.forEach(progress => {
        const specialty = progress.caseId?.specialty || 'Unknown';
        specialtyCount[specialty] = (specialtyCount[specialty] || 0) + 1;
      });

      const popularSpecialties = Object.entries(specialtyCount)
        .map(([specialty, count]) => ({ specialty, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // User engagement (simplified)
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [dailyActive, weeklyActive, monthlyActive] = await Promise.all([
        User.countDocuments({ 'statistics.lastActiveDate': { $gte: dayAgo } }),
        User.countDocuments({ 'statistics.lastActiveDate': { $gte: weekAgo } }),
        User.countDocuments({ 'statistics.lastActiveDate': { $gte: monthAgo } })
      ]);

      return {
        totalUsers,
        totalCases,
        totalSessions,
        averageSessionTime,
        popularSpecialties,
        userEngagement: {
          dailyActiveUsers: dailyActive,
          weeklyActiveUsers: weeklyActive,
          monthlyActiveUsers: monthlyActive
        }
      };

    } catch (error) {
      logger.error('Get system analytics error:', error);
      throw error;
    }
  }
};

module.exports = analyticsService;