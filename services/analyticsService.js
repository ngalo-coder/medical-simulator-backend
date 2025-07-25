// services/analyticsService.js
const { User, Case, Progress, Analytics } = require('../models');
const logger = require('../utils/logger');
const { redisUtils } = require('../config/redis');

const analyticsService = {
  async calculateUserPerformance(userId, timeframe = '30d') {
    try {
      const cacheKey = `user_performance_${userId}_${timeframe}`;
      const cached = await redisUtils.get(cacheKey);
      if (cached) return cached;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeframe) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get user progress data
      const progressData = await Progress.find({
        userId,
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('caseId', 'specialty difficulty metadata.maxScore');

      if (progressData.length === 0) {
        return {
          totalCases: 0,
          averageScore: 0,
          totalTimeSpent: 0,
          averageTimePerCase: 0,
          specialtyBreakdown: {},
          difficultyBreakdown: {},
          performanceTrend: []
        };
      }

      // Calculate metrics
      const totalScore = progressData.reduce((sum, p) => sum + p.percentageScore, 0);
      const totalTime = progressData.reduce((sum, p) => sum + p.timeSpent, 0);

      const performance = {
        totalCases: progressData.length,
        averageScore: Math.round(totalScore / progressData.length),
        totalTimeSpent: totalTime,
        averageTimePerCase: Math.round(totalTime / progressData.length),
        specialtyBreakdown: this.calculateSpecialtyBreakdown(progressData),
        difficultyBreakdown: this.calculateDifficultyBreakdown(progressData),
        performanceTrend: this.calculatePerformanceTrend(progressData)
      };

      // Cache for 1 hour
      await redisUtils.set(cacheKey, performance, 3600);
      return performance;

    } catch (error) {
      logger.error('Calculate user performance error:', error);
      throw error;
    }
  },

  calculateSpecialtyBreakdown(progressData) {
    const breakdown = {};
    
    progressData.forEach(progress => {
      const specialty = progress.caseId.specialty;
      if (!breakdown[specialty]) {
        breakdown[specialty] = {
          casesCompleted: 0,
          totalScore: 0,
          totalTime: 0
        };
      }
      
      breakdown[specialty].casesCompleted += 1;
      breakdown[specialty].totalScore += progress.percentageScore;
      breakdown[specialty].totalTime += progress.timeSpent;
    });

    // Calculate averages
    Object.keys(breakdown).forEach(specialty => {
      const data = breakdown[specialty];
      data.averageScore = Math.round(data.totalScore / data.casesCompleted);
      data.averageTime = Math.round(data.totalTime / data.casesCompleted);
    });

    return breakdown;
  },

  calculateDifficultyBreakdown(progressData) {
    const breakdown = {};
    
    progressData.forEach(progress => {
      const difficulty = progress.caseId.difficulty;
      if (!breakdown[difficulty]) {
        breakdown[difficulty] = {
          casesCompleted: 0,
          totalScore: 0,
          totalTime: 0
        };
      }
      
      breakdown[difficulty].casesCompleted += 1;
      breakdown[difficulty].totalScore += progress.percentageScore;
      breakdown[difficulty].totalTime += progress.timeSpent;
    });

    // Calculate averages
    Object.keys(breakdown).forEach(difficulty => {
      const data = breakdown[difficulty];
      data.averageScore = Math.round(data.totalScore / data.casesCompleted);
      data.averageTime = Math.round(data.totalTime / data.casesCompleted);
    });

    return breakdown;
  },

  calculatePerformanceTrend(progressData) {
    // Sort by date
    const sortedData = progressData.sort((a, b) => a.createdAt - b.createdAt);
    
    // Group by week
    const weeklyData = {};
    sortedData.forEach(progress => {
      const weekStart = this.getWeekStart(progress.createdAt);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekKey,
          cases: 0,
          totalScore: 0,
          totalTime: 0
        };
      }
      
      weeklyData[weekKey].cases += 1;
      weeklyData[weekKey].totalScore += progress.percentageScore;
      weeklyData[weekKey].totalTime += progress.timeSpent;
    });

    // Calculate weekly averages
    return Object.values(weeklyData).map(week => ({
      week: week.week,
      casesCompleted: week.cases,
      averageScore: Math.round(week.totalScore / week.cases),
      averageTime: Math.round(week.totalTime / week.cases)
    }));
  },

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  },

  async calculateInstitutionMetrics(institution) {
    try {
      const users = await User.find({ 'profile.institution': institution });
      const userIds = users.map(u => u._id);

      const progressData = await Progress.find({
        userId: { $in: userIds },
        status: 'completed'
      }).populate('caseId', 'specialty difficulty');

      return {
        totalUsers: users.length,
        totalCasesCompleted: progressData.length,
        averageScore: progressData.length > 0 
          ? Math.round(progressData.reduce((sum, p) => sum + p.percentageScore, 0) / progressData.length)
          : 0,
        specialtyDistribution: this.calculateSpecialtyBreakdown(progressData),
        userRoleDistribution: this.calculateRoleDistribution(users)
      };

    } catch (error) {
      logger.error('Calculate institution metrics error:', error);
      throw error;
    }
  },

  calculateRoleDistribution(users) {
    const distribution = {};
    users.forEach(user => {
      distribution[user.role] = (distribution[user.role] || 0) + 1;
    });
    return distribution;
  },

  async generateSystemMetrics() {
    try {
      const [
        totalUsers,
        totalCases,
        totalProgress,
        completedProgress,
        activeUsers
      ] = await Promise.all([
        User.countDocuments(),
        Case.countDocuments({ 'metadata.status': 'published' }),
        Progress.countDocuments(),
        Progress.countDocuments({ status: 'completed' }),
        User.countDocuments({ 
          'statistics.lastActiveDate': { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
          } 
        })
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          activityRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
        },
        cases: {
          total: totalCases,
          averageCompletionRate: totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0
        },
        engagement: {
          totalSessions: totalProgress,
          completedSessions: completedProgress,
          completionRate: totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0
        }
      };

    } catch (error) {
      logger.error('Generate system metrics error:', error);
      throw error;
    }
  }
};

module.exports = analyticsService;