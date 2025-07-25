// services/aiService.js
const { User, Case, Progress, Analytics } = require('../models');
const logger = require('../utils/logger');

const aiService = {
  async generateRecommendations(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's progress history
      const userProgress = await Progress.find({ userId, status: 'completed' })
        .populate('caseId', 'specialty difficulty bodySystem tags metadata.maxScore')
        .sort({ createdAt: -1 })
        .limit(50);

      if (userProgress.length === 0) {
        return this.getBeginnerRecommendations(user);
      }

      // Analyze performance patterns
      const analysis = await this.analyzeUserPerformance(userProgress);
      
      // Generate personalized recommendations
      const recommendations = await this.generatePersonalizedRecommendations(user, analysis);

      return {
        type: 'personalized_recommendations',
        recommendations,
        analysis,
        reasoning: this.generateRecommendationReasoning(analysis)
      };

    } catch (error) {
      logger.error('AI recommendation error:', error);
      throw error;
    }
  },

  async getBeginnerRecommendations(user) {
    const preferredSpecialties = user.preferences.specialties.length > 0 
      ? user.preferences.specialties 
      : ['Internal Medicine', 'Family Medicine'];

    const beginnerCases = await Case.find({
      'metadata.status': 'published',
      difficulty: 'beginner',
      specialty: { $in: preferredSpecialties }
    })
    .sort({ 'metadata.averageScore': -1, 'metadata.completionRate': -1 })
    .limit(5)
    .lean();

    return {
      type: 'beginner_recommendations',
      recommendations: beginnerCases,
      reasoning: 'Welcome! Here are some highly-rated beginner cases to get you started.'
    };
  },

  async analyzeUserPerformance(userProgress) {
    const analysis = {
      averageScore: 0,
      totalCases: userProgress.length,
      specialtyPerformance: {},
      difficultyPerformance: {},
      timePatterns: {},
      strengths: [],
      weaknesses: [],
      trends: {}
    };

    // Calculate overall performance
    const totalScore = userProgress.reduce((sum, p) => sum + p.percentageScore, 0);
    analysis.averageScore = Math.round(totalScore / userProgress.length);

    // Analyze by specialty
    const specialtyGroups = this.groupBy(userProgress, p => p.caseId.specialty);
    for (const [specialty, cases] of Object.entries(specialtyGroups)) {
      const avgScore = cases.reduce((sum, c) => sum + c.percentageScore, 0) / cases.length;
      analysis.specialtyPerformance[specialty] = {
        averageScore: Math.round(avgScore),
        casesCompleted: cases.length,
        trend: this.calculateTrend(cases.map(c => c.percentageScore))
      };

      if (avgScore >= analysis.averageScore * 1.1) {
        analysis.strengths.push(specialty);
      } else if (avgScore <= analysis.averageScore * 0.9) {
        analysis.weaknesses.push(specialty);
      }
    }

    // Analyze by difficulty
    const difficultyGroups = this.groupBy(userProgress, p => p.caseId.difficulty);
    for (const [difficulty, cases] of Object.entries(difficultyGroups)) {
      const avgScore = cases.reduce((sum, c) => sum + c.percentageScore, 0) / cases.length;
      analysis.difficultyPerformance[difficulty] = {
        averageScore: Math.round(avgScore),
        casesCompleted: cases.length
      };
    }

    // Determine next difficulty level
    analysis.recommendedDifficulty = this.determineNextDifficulty(analysis);

    return analysis;
  },

  async generatePersonalizedRecommendations(user, analysis) {
    const recommendations = [];

    // 1. Improvement cases (weak specialties)
    if (analysis.weaknesses.length > 0) {
      const improvementCases = await Case.find({
        'metadata.status': 'published',
        specialty: { $in: analysis.weaknesses },
        difficulty: { $in: ['beginner', 'intermediate'] }
      })
      .sort({ 'metadata.averageScore': -1 })
      .limit(3)
      .lean();

      recommendations.push({
        category: 'improvement',
        cases: improvementCases,
        reason: `Focus on ${analysis.weaknesses.join(', ')} to improve your skills`
      });
    }

    // 2. Challenge cases (strong specialties, higher difficulty)
    if (analysis.strengths.length > 0) {
      const challengeCases = await Case.find({
        'metadata.status': 'published',
        specialty: { $in: analysis.strengths },
        difficulty: analysis.recommendedDifficulty
      })
      .sort({ 'metadata.averageScore': -1 })
      .limit(2)
      .lean();

      recommendations.push({
        category: 'challenge',
        cases: challengeCases,
        reason: `Advanced cases in your strong areas: ${analysis.strengths.join(', ')}`
      });
    }

    // 3. Exploration cases (new specialties)
    const completedSpecialties = Object.keys(analysis.specialtyPerformance);
    const allSpecialties = await Case.distinct('specialty', { 'metadata.status': 'published' });
    const unexploredSpecialties = allSpecialties.filter(s => !completedSpecialties.includes(s));

    if (unexploredSpecialties.length > 0) {
      const explorationCases = await Case.find({
        'metadata.status': 'published',
        specialty: { $in: unexploredSpecialties.slice(0, 2) },
        difficulty: 'beginner'
      })
      .sort({ 'metadata.averageScore': -1 })
      .limit(2)
      .lean();

      recommendations.push({
        category: 'exploration',
        cases: explorationCases,
        reason: `Explore new specialties: ${unexploredSpecialties.slice(0, 2).join(', ')}`
      });
    }

    return recommendations.flat();
  },

  determineNextDifficulty(analysis) {
    if (analysis.averageScore >= 85) {
      return 'advanced';
    } else if (analysis.averageScore >= 70) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  },

  calculateTrend(scores) {
    if (scores.length < 3) return 'stable';
    
    const recent = scores.slice(-3);
    const older = scores.slice(0, 3);
    
    const recentAvg = recent.reduce((sum, s) => sum + s, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  },

  generateRecommendationReasoning(analysis) {
    const reasons = [];
    
    if (analysis.averageScore >= 80) {
      reasons.push(`Excellent performance (${analysis.averageScore}% average)`);
    } else if (analysis.averageScore >= 60) {
      reasons.push(`Good progress (${analysis.averageScore}% average)`);
    } else {
      reasons.push(`Focus on fundamentals (${analysis.averageScore}% average)`);
    }

    if (analysis.strengths.length > 0) {
      reasons.push(`Strong in: ${analysis.strengths.join(', ')}`);
    }

    if (analysis.weaknesses.length > 0) {
      reasons.push(`Improve in: ${analysis.weaknesses.join(', ')}`);
    }

    return reasons.join('. ');
  },

  groupBy(array, keyFn) {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  },

  async updateUserAnalytics(userId) {
    try {
      const analysis = await this.generateRecommendations(userId);
      
      // Save analytics to database
      await Analytics.findOneAndUpdate(
        { userId },
        {
          userId,
          performanceMetrics: {
            accuracy: analysis.analysis?.averageScore || 0,
            // Add more metrics as needed
          },
          learningPattern: {
            strongSpecialties: analysis.analysis?.strengths || [],
            weakSpecialties: analysis.analysis?.weaknesses || [],
            // Add more patterns
          },
          calculatedAt: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        },
        { upsert: true, new: true }
      );

    } catch (error) {
      logger.error('Update user analytics error:', error);
    }
  }
};

module.exports = aiService;




/***
 * const Case = require('../models/Case');
const { USER_ROLES } = require('./constants');

const aiService = {
  groupBy(array, keyFunction) {
    return array.reduce((groups, item) => {
      const key = keyFunction(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  },

  async generateRecommendations(userId, userProgress) {
    // Simple recommendation logic based on user performance
    if (userProgress.length === 0) {
      // New user - recommend highly-rated beginner cases
      const preferredSpecialties = ['Internal Medicine', 'Emergency Medicine'];
      const beginnerCases = await Case.find({
        'metadata.status': 'published',
        difficulty: 'beginner',
        specialty: { $in: preferredSpecialties }
      }).sort({ 'metadata.averageScore': -1, 'metadata.completionRate': -1 }).limit(5).lean();

      return {
        type: 'beginner_recommendations',
        recommendations: beginnerCases,
        reasoning: 'Welcome! Here are some highly-rated beginner cases to get you started.'
      };
    }

    // Analyze user performance
    const analysis = await this.analyzeUserPerformance(userProgress);

    // Generate recommendations based on analysis
    const recommendations = [];

    // 1. Strengthening cases (weak specialties)
    if (analysis.weaknesses.length > 0) {
      const strengtheningCases = await Case.find({
        'metadata.status': 'published',
        specialty: { $in: analysis.weaknesses },
        difficulty: analysis.recommendedDifficulty
      }).sort({ 'metadata.averageScore': -1 }).limit(3).lean();

      recommendations.push({
        category: 'strengthening',
        cases: strengtheningCases,
        reason: `Focus on ${analysis.weaknesses.join(', ')} to improve your skills`
      });
    }

    // 2. Challenge cases (strong specialties, higher difficulty)
    if (analysis.strengths.length > 0) {
      const challengeCases = await Case.find({
        'metadata.status': 'published',
        specialty: { $in: analysis.strengths },
        difficulty: analysis.recommendedDifficulty
      }).sort({ 'metadata.averageScore': -1 }).limit(2).lean();

      recommendations.push({
        category: 'challenge',
        cases: challengeCases,
        reason: `Advanced cases in your strong areas: ${analysis.strengths.join(', ')}`
      });
    }

    // 3. Exploration cases (new specialties)
    const completedSpecialties = Object.keys(analysis.specialtyPerformance);
    const allSpecialties = await Case.distinct('specialty', { 'metadata.status': 'published' });
    const unexploredSpecialties = allSpecialties.filter(s => !completedSpecialties.includes(s));

    if (unexploredSpecialties.length > 0) {
      const explorationCases = await Case.find({
        'metadata.status': 'published',
        specialty: { $in: unexploredSpecialties.slice(0, 2) },
        difficulty: 'beginner'
      }).sort({ 'metadata.averageScore': -1 }).limit(2).lean();

      recommendations.push({
        category: 'exploration',
        cases: explorationCases,
        reason: `Explore new specialties: ${unexploredSpecialties.slice(0, 2).join(', ')}`
      });
    }

    return recommendations.flat();
  },

  async analyzeUserPerformance(userProgress) {
    const analysis = {
      averageScore: 0,
      totalCases: userProgress.length,
      specialtyPerformance: {},
      difficultyPerformance: {},
      timePatterns: {},
      strengths: [],
      weaknesses: [],
      trends: {}
    };

    // Calculate overall performance
    if (userProgress.length > 0) {
      const totalScore = userProgress.reduce((sum, p) => sum + p.percentageScore, 0);
      analysis.averageScore = Math.round(totalScore / userProgress.length);
    }

    // Analyze by specialty
    const specialtyGroups = this.groupBy(userProgress, p => p.caseId.specialty);
    for (const [specialty, cases] of Object.entries(specialtyGroups)) {
      const avgScore = cases.reduce((sum, c) => sum + c.percentageScore, 0) / cases.length;
      analysis.specialtyPerformance[specialty] = {
        averageScore: Math.round(avgScore),
        casesCompleted: cases.length
      };

      if (avgScore >= analysis.averageScore * 1.1) {
        analysis.strengths.push(specialty);
      } else if (avgScore <= analysis.averageScore * 0.9) {
        analysis.weaknesses.push(specialty);
      }
    }

    // Analyze by difficulty
    const difficultyGroups = this.groupBy(userProgress, p => p.caseId.difficulty);
    for (const [difficulty, cases] of Object.entries(difficultyGroups)) {
      const avgScore = cases.reduce((sum, c) => sum + c.percentageScore, 0) / cases.length;
      analysis.difficultyPerformance[difficulty] = {
        averageScore: Math.round(avgScore),
        casesCompleted: cases.length
      };
    }

    // Determine next difficulty level
    analysis.recommendedDifficulty = this.determineNextDifficulty(analysis);

    // Calculate trend
    const scores = userProgress.map(p => p.percentageScore);
    analysis.trends.scoreTrend = this.calculateTrend(scores);

    return analysis;
  },

  determineNextDifficulty(analysis) {
    if (analysis.averageScore >= 85) {
      return 'advanced';
    } else if (analysis.averageScore >= 70) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  },

  calculateTrend(scores) {
    if (scores.length < 3) return 'stable';

    const recent = scores.slice(-3);
    const older = scores.slice(0, 3);
    const recentAvg = recent.reduce((sum, s) => sum + s, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s, 0) / older.length;

    if (recentAvg > olderAvg + 5) return 'improving';
    if (recentAvg < olderAvg - 5) return 'declining';
    return 'stable';
  }
};

module.exports = aiService;
 */