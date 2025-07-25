// services/notificationService.js (CORRECTED VERSION)
const { getRedisClient } = require('../config/redis');
const emailService = require('./emailService');
const logger = require('../utils/logger');

const notificationService = {
  // Send real-time notification via Socket.IO
  async sendRealTimeNotification(io, userId, notification) {
    try {
      const notificationData = {
        id: Date.now(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        timestamp: new Date(),
        read: false
      };

      // Send to specific user
      io.to(`user_${userId}`).emit('notification', notificationData);
      
      // Store for offline users
      await this.storeNotification(userId, notificationData);
      
      logger.info(`Real-time notification sent to user ${userId}: ${notification.title}`);
      return true;
    } catch (error) {
      logger.error('Real-time notification error:', error);
      return false;
    }
  },

  // Send achievement notification
  async sendAchievementNotification(io, user, achievement) {
    try {
      // Real-time notification
      await this.sendRealTimeNotification(io, user._id, {
        type: 'achievement',
        title: 'New Achievement Unlocked!',
        message: `You've earned the "${achievement.name}" achievement`,
        data: { achievement }
      });

      // Email notification (if enabled)
      if (user.preferences && user.preferences.notificationsEnabled !== false) {
        try {
          await emailService.sendAchievementNotification(user, achievement);
        } catch (emailError) {
          logger.error('Achievement email notification failed:', emailError);
          // Continue execution even if email fails
        }
      }

      return true;
    } catch (error) {
      logger.error('Achievement notification error:', error);
      return false;
    }
  },

  // Send case review notification
  async sendCaseReviewNotification(io, author, case_obj, review) {
    try {
      // Real-time notification
      await this.sendRealTimeNotification(io, author._id, {
        type: 'case_review',
        title: 'Case Review Completed',
        message: `Your case "${case_obj.title}" has been reviewed`,
        data: { caseId: case_obj._id, reviewId: review._id, status: review.status }
      });

      // Email notification (if enabled)
      if (author.preferences && author.preferences.notificationsEnabled !== false) {
        try {
          await emailService.sendCaseReviewNotification(author, case_obj, review);
        } catch (emailError) {
          logger.error('Case review email notification failed:', emailError);
          // Continue execution even if email fails
        }
      }

      return true;
    } catch (error) {
      logger.error('Case review notification error:', error);
      return false;
    }
  },

  // Send discussion notification
  async sendDiscussionNotification(io, participants, caseTitle, discussionData) {
    try {
      const promises = participants.map(async (participant) => {
        // Notify participants except the author
        if (participant._id.toString() !== discussionData.userId.toString()) {
          return this.sendRealTimeNotification(io, participant._id, {
            type: 'discussion',
            title: 'New Discussion Activity',
            message: `New comment on "${caseTitle}"`,
            data: {
              caseId: discussionData.caseId,
              discussionId: discussionData._id,
              caseTitle
            }
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      logger.error('Discussion notification error:', error);
      return false;
    }
  },

  // Send system notification to all users
  async sendSystemNotification(io, notification) {
    try {
      const systemNotificationData = {
        id: Date.now(),
        type: 'system',
        title: notification.title,
        message: notification.message,
        priority: notification.priority || 'normal',
        timestamp: new Date(),
        data: notification.data || {}
      };

      // Broadcast to all connected users
      io.emit('system_notification', systemNotificationData);
      
      logger.info(`System notification sent: ${notification.title}`);
      return true;
    } catch (error) {
      logger.error('System notification error:', error);
      return false;
    }
  },

  // Send notification to specific user group
  async sendGroupNotification(io, userIds, notification) {
    try {
      const promises = userIds.map(userId => 
        this.sendRealTimeNotification(io, userId, notification)
      );

      await Promise.all(promises);
      
      logger.info(`Group notification sent to ${userIds.length} users: ${notification.title}`);
      return true;
    } catch (error) {
      logger.error('Group notification error:', error);
      return false;
    }
  },

  // Store notification for offline users
  async storeNotification(userId, notification) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) {
        logger.warn('Redis not available, notification not stored for offline access');
        return false;
      }

      const key = `notifications_${userId}`;
      const notificationData = {
        ...notification,
        id: notification.id || Date.now(),
        timestamp: notification.timestamp || new Date(),
        read: false
      };

      // Add to list (newest first)
      await redisClient.lpush(key, JSON.stringify(notificationData));
      
      // Keep only last 100 notifications
      await redisClient.ltrim(key, 0, 99);
      
      // Set expiration (30 days)
      await redisClient.expire(key, 30 * 24 * 60 * 60);

      return true;
    } catch (error) {
      logger.error('Store notification error:', error);
      return false;
    }
  },

  // Get stored notifications for user
  async getStoredNotifications(userId, limit = 50) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return [];

      const key = `notifications_${userId}`;
      const notifications = await redisClient.lrange(key, 0, limit - 1);
      
      return notifications.map(n => {
        try {
          return JSON.parse(n);
        } catch (parseError) {
          logger.error('Failed to parse stored notification:', parseError);
          return null;
        }
      }).filter(Boolean); // Remove null values
      
    } catch (error) {
      logger.error('Get stored notifications error:', error);
      return [];
    }
  },

  // Mark notification as read
  async markAsRead(userId, notificationId) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return false;

      const key = `notifications_${userId}`;
      const notifications = await redisClient.lrange(key, 0, -1);
      
      const updatedNotifications = notifications.map(n => {
        try {
          const parsed = JSON.parse(n);
          if (parsed.id === notificationId || parsed.id === parseInt(notificationId)) {
            parsed.read = true;
            parsed.readAt = new Date();
          }
          return JSON.stringify(parsed);
        } catch (parseError) {
          return n; // Return original if parsing fails
        }
      });

      // Replace the entire list with updated notifications
      await redisClient.del(key);
      if (updatedNotifications.length > 0) {
        await redisClient.rpush(key, ...updatedNotifications);
        await redisClient.expire(key, 30 * 24 * 60 * 60); // 30 days
      }

      return true;
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      return false;
    }
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return false;

      const key = `notifications_${userId}`;
      const notifications = await redisClient.lrange(key, 0, -1);
      
      const updatedNotifications = notifications.map(n => {
        try {
          const parsed = JSON.parse(n);
          if (!parsed.read) {
            parsed.read = true;
            parsed.readAt = new Date();
          }
          return JSON.stringify(parsed);
        } catch (parseError) {
          return n;
        }
      });

      await redisClient.del(key);
      if (updatedNotifications.length > 0) {
        await redisClient.rpush(key, ...updatedNotifications);
        await redisClient.expire(key, 30 * 24 * 60 * 60);
      }

      return true;
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      return false;
    }
  },

  // Get unread notification count
  async getUnreadCount(userId) {
    try {
      const notifications = await this.getStoredNotifications(userId);
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      logger.error('Get unread count error:', error);
      return 0;
    }
  },

  // Delete notification
  async deleteNotification(userId, notificationId) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return false;

      const key = `notifications_${userId}`;
      const notifications = await redisClient.lrange(key, 0, -1);
      
      const filteredNotifications = notifications.filter(n => {
        try {
          const parsed = JSON.parse(n);
          return parsed.id !== notificationId && parsed.id !== parseInt(notificationId);
        } catch (parseError) {
          return true; // Keep if can't parse
        }
      });

      await redisClient.del(key);
      if (filteredNotifications.length > 0) {
        await redisClient.rpush(key, ...filteredNotifications);
        await redisClient.expire(key, 30 * 24 * 60 * 60);
      }

      return true;
    } catch (error) {
      logger.error('Delete notification error:', error);
      return false;
    }
  },

  // Clear all notifications for a user
  async clearAllNotifications(userId) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return false;

      const key = `notifications_${userId}`;
      await redisClient.del(key);
      
      return true;
    } catch (error) {
      logger.error('Clear all notifications error:', error);
      return false;
    }
  },

  // Send welcome notification to new users
  async sendWelcomeNotification(io, user) {
    try {
      await this.sendRealTimeNotification(io, user._id, {
        type: 'welcome',
        title: 'Welcome to Medical Case Simulator!',
        message: `Hello ${user.profile.firstName}! Start your learning journey by exploring our case library.`,
        data: {
          actionUrl: '/cases',
          actionText: 'Browse Cases'
        }
      });

      // Send welcome email
      if (user.preferences && user.preferences.notificationsEnabled !== false) {
        try {
          await emailService.sendWelcomeEmail(user);
        } catch (emailError) {
          logger.error('Welcome email failed:', emailError);
        }
      }

      return true;
    } catch (error) {
      logger.error('Welcome notification error:', error);
      return false;
    }
  },

  // Send daily digest notification
  async sendDailyDigest(io, user, digestData) {
    try {
      const { completedCases, newAchievements, recommendedCases } = digestData;

      if (completedCases > 0 || newAchievements > 0) {
        await this.sendRealTimeNotification(io, user._id, {
          type: 'daily_digest',
          title: 'Your Daily Learning Summary',
          message: `You completed ${completedCases} cases and earned ${newAchievements} achievements today!`,
          data: {
            completedCases,
            newAchievements,
            recommendedCases: recommendedCases || [],
            actionUrl: '/dashboard',
            actionText: 'View Dashboard'
          }
        });
      }

      return true;
    } catch (error) {
      logger.error('Daily digest notification error:', error);
      return false;
    }
  }
};

module.exports = notificationService;