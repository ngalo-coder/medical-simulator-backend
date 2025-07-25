// controllers/adminController.js
const { User, Case, Progress, Review } = require('../models');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

const adminController = {
  async getDashboardStats(req, res) {
    try {
      const systemMetrics = await analyticsService.generateSystemMetrics();
      
      // Get recent activity
      const [recentUsers, recentCases, recentProgress] = await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('profile email role createdAt')
          .lean(),
        Case.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('metadata.author', 'profile.firstName profile.lastName')
          .select('title specialty difficulty metadata.status createdAt')
          .lean(),
        Progress.find({ status: 'completed' })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('userId', 'profile.firstName profile.lastName')
          .populate('caseId', 'title')
          .select('percentageScore timeSpent createdAt')
          .lean()
      ]);

      res.json({
        overview: systemMetrics,
        recentActivity: {
          users: recentUsers,
          cases: recentCases,
          completedSessions: recentProgress
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Admin dashboard stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve dashboard statistics',
        code: 'ADMIN_STATS_ERROR'
      });
    }
  },

  async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        institution,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter
      const filter = {};
      if (role) filter.role = role;
      if (institution) filter['profile.institution'] = new RegExp(institution, 'i');
      if (search) {
        filter.$or = [
          { email: new RegExp(search, 'i') },
          { 'profile.firstName': new RegExp(search, 'i') },
          { 'profile.lastName': new RegExp(search, 'i') }
        ];
      }

      const skip = (page - 1) * limit;
      const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [users, totalCount] = await Promise.all([
        User.find(filter)
          .select('-password -refreshTokens')
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(filter)
      ]);

      res.json({
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: skip + users.length < totalCount,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users',
        code: 'USERS_FETCH_ERROR'
      });
    }
  },

  async getUserDetails(req, res) {
    try {
      const { id } = req.params;

      const [user, userProgress, userStats] = await Promise.all([
        User.findById(id)
          .select('-password -refreshTokens')
          .lean(),
        Progress.find({ userId: id })
          .populate('caseId', 'title specialty difficulty')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        analyticsService.calculateUserPerformance(id)
      ]);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        user,
        recentProgress: userProgress,
        analytics: userStats
      });

    } catch (error) {
      logger.error('Get user details error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user details',
        code: 'USER_DETAILS_ERROR'
      });
    }
  },

  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['student', 'resident', 'attending', 'instructor', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role specified',
          code: 'INVALID_ROLE'
        });
      }

      const user = await User.findByIdAndUpdate(
        id,
        { role },
        { new: true }
      ).select('-password -refreshTokens');

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      logger.info(`User role updated: ${user.email} -> ${role} by admin: ${req.user.email}`);

      res.json({
        message: 'User role updated successfully',
        user
      });

    } catch (error) {
      logger.error('Update user role error:', error);
      res.status(500).json({
        error: 'Failed to update user role',
        code: 'ROLE_UPDATE_ERROR'
      });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent deleting self
      if (id === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Cannot delete your own account',
          code: 'CANNOT_DELETE_SELF'
        });
      }

      // Check if user has progress records
      const progressCount = await Progress.countDocuments({ userId: id });
      
      if (progressCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete user with existing progress records',
          code: 'USER_HAS_PROGRESS'
        });
      }

      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      logger.info(`User deleted: ${user.email} by admin: ${req.user.email}`);

      res.json({
        message: 'User deleted successfully'
      });

    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        error: 'Failed to delete user',
        code: 'USER_DELETE_ERROR'
      });
    }
  },

  async getPendingCases(req, res) {
    try {
      const pendingCases = await Case.find({ 'metadata.status': 'review' })
        .populate('metadata.author', 'profile.firstName profile.lastName email')
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        cases: pendingCases,
        count: pendingCases.length
      });

    } catch (error) {
      logger.error('Get pending cases error:', error);
      res.status(500).json({
        error: 'Failed to retrieve pending cases',
        code: 'PENDING_CASES_ERROR'
      });
    }
  },

  async reviewCase(req, res) {
    try {
      const { id } = req.params;
      const { status, comments, criteria } = req.body;

      const validStatuses = ['approved', 'rejected', 'needs_revision'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid review status',
          code: 'INVALID_STATUS'
        });
      }

      // Create review record
      const review = new Review({
        caseId: id,
        reviewerId: req.user._id,
        reviewType: 'expert',
        status,
        comments,
        criteria,
        overallScore: criteria ? Object.values(criteria).reduce((sum, c) => sum + c.score, 0) / Object.keys(criteria).length : 0
      });

      await review.save();

      // Update case status
      const newCaseStatus = status === 'approved' ? 'published' : 'review';
      const case_obj = await Case.findByIdAndUpdate(
        id,
        { 
          'metadata.status': newCaseStatus,
          $push: { 'metadata.reviewers': req.user._id }
        },
        { new: true }
      );

      logger.info(`Case reviewed: ${id} -> ${status} by admin: ${req.user.email}`);

      res.json({
        message: 'Case review completed successfully',
        review,
        case: case_obj
      });

    } catch (error) {
      logger.error('Review case error:', error);
      res.status(500).json({
        error: 'Failed to review case',
        code: 'CASE_REVIEW_ERROR'
      });
    }
  },

  async getCaseStatistics(req, res) {
    try {
      const [
        totalCases,
        publishedCases,
        draftCases,
        reviewCases,
        specialtyStats,
        difficultyStats
      ] = await Promise.all([
        Case.countDocuments(),
        Case.countDocuments({ 'metadata.status': 'published' }),
        Case.countDocuments({ 'metadata.status': 'draft' }),
        Case.countDocuments({ 'metadata.status': 'review' }),
        Case.aggregate([
          { $group: { _id: '$specialty', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Case.aggregate([
          { $group: { _id: '$difficulty', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])
      ]);

      res.json({
        overview: {
          total: totalCases,
          published: publishedCases,
          draft: draftCases,
          review: reviewCases
        },
        specialtyDistribution: specialtyStats,
        difficultyDistribution: difficultyStats
      });

    } catch (error) {
      logger.error('Get case statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve case statistics',
        code: 'CASE_STATS_ERROR'
      });
    }
  },

  async getSystemHealth(req, res) {
    try {
      const mongoose = require('mongoose');
      
      // Database health
      const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
      
      // Memory usage
      const memoryUsage = process.memoryUsage();
      
      // Disk space (if available)
      let diskSpace = null;
      try {
        const stats = await fs.stat(process.cwd());
        diskSpace = {
          available: 'Unknown', // Would need additional package for disk space
          used: 'Unknown'
        };
      } catch (error) {
        // Disk space check failed
      }

      // CPU usage (basic)
      const cpuUsage = process.cpuUsage();

      res.json({
        status: dbStatus === 'healthy' ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        uptime: Math.floor(process.uptime()),
        database: {
          status: dbStatus,
          connections: mongoose.connections.length
        },
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        disk: diskSpace,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version
      });

    } catch (error) {
      logger.error('Get system health error:', error);
      res.status(500).json({
        error: 'Failed to retrieve system health',
        code: 'SYSTEM_HEALTH_ERROR'
      });
    }
  },

  async getSystemLogs(req, res) {
    try {
      const { level = 'error', limit = 100 } = req.query;
      
      // Read log files (this is a simplified version)
      const logPath = path.join(process.cwd(), 'logs', `${level}.log`);
      
      try {
        const logContent = await fs.readFile(logPath, 'utf8');
        const logs = logContent
          .split('\n')
          .filter(line => line.trim())
          .slice(-limit)
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return { message: line, timestamp: new Date() };
            }
          });

        res.json({
          logs,
          level,
          count: logs.length
        });
      } catch (fileError) {
        res.json({
          logs: [],
          level,
          count: 0,
          message: 'No log file found or accessible'
        });
      }

    } catch (error) {
      logger.error('Get system logs error:', error);
      res.status(500).json({
        error: 'Failed to retrieve system logs',
        code: 'SYSTEM_LOGS_ERROR'
      });
    }
  },

  async getSystemStats(req, res) {
    try {
      const [
        totalUsers,
        totalCases,
        totalProgress,
        activeUsers,
        recentActivity
      ] = await Promise.all([
        User.countDocuments(),
        Case.countDocuments(),
        Progress.countDocuments(),
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
        Progress.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
      ]);

      const systemMetrics = await analyticsService.generateSystemMetrics();

      res.json({
        overview: {
          totalUsers,
          totalCases,
          totalProgress,
          activeUsers,
          recentActivity
        },
        performance: systemMetrics,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get system stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve system statistics',
        code: 'SYSTEM_STATS_ERROR'
      });
    }
  },

  async createBackup(req, res) {
    try {
      const mongoose = require('mongoose');
      const backupId = `backup_${Date.now()}`;
      
      // Get all collections data
      const collections = await mongoose.connection.db.listCollections().toArray();
      const backup = {
        id: backupId,
        timestamp: new Date(),
        collections: {}
      };

      for (const collection of collections) {
        const collectionName = collection.name;
        const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        backup.collections[collectionName] = data;
      }

      // In production, you would save this to cloud storage
      // For now, we'll just return the backup info
      res.json({
        message: 'Backup created successfully',
        backupId,
        timestamp: backup.timestamp,
        collectionsCount: Object.keys(backup.collections).length,
        // In production, include download URL
        note: 'In production, backup would be saved to cloud storage'
      });

      logger.info(`Database backup created: ${backupId} by admin: ${req.user.email}`);

    } catch (error) {
      logger.error('Create backup error:', error);
      res.status(500).json({
        error: 'Failed to create backup',
        code: 'BACKUP_ERROR'
      });
    }
  }
};

module.exports = adminController;