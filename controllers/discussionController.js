// controllers/discussionController.js
const { Discussion, Case, User } = require('../models');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const discussionController = {
  async getDiscussions(req, res) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', caseId } = req.query;

      const skip = (page - 1) * limit;
      const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build filter
      const filter = { parentId: null };
      if (caseId) filter.caseId = caseId;

      const [discussions, totalCount] = await Promise.all([
        Discussion.find(filter)
          .populate('userId', 'profile.firstName profile.lastName role')
          .populate('caseId', 'title specialty')
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Discussion.countDocuments(filter)
      ]);

      // Get replies for each discussion
      for (let discussion of discussions) {
        const replies = await Discussion.find({ parentId: discussion._id })
          .populate('userId', 'profile.firstName profile.lastName role')
          .sort({ createdAt: 1 })
          .lean();
        discussion.replies = replies;
        discussion.replyCount = replies.length;
        discussion.voteScore = discussion.votes.upvotes.length - discussion.votes.downvotes.length;
      }

      res.json({
        discussions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: skip + discussions.length < totalCount,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      logger.error('Get discussions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve discussions',
        code: 'DISCUSSIONS_FETCH_ERROR'
      });
    }
  },

  async getDiscussionById(req, res) {
    try {
      const { id } = req.params;

      const discussion = await Discussion.findById(id)
        .populate('userId', 'profile.firstName profile.lastName role')
        .populate('caseId', 'title specialty')
        .lean();

      if (!discussion) {
        return res.status(404).json({
          error: 'Discussion not found',
          code: 'DISCUSSION_NOT_FOUND'
        });
      }

      // Get replies
      const replies = await Discussion.find({ parentId: id })
        .populate('userId', 'profile.firstName profile.lastName role')
        .sort({ createdAt: 1 })
        .lean();

      discussion.replies = replies;
      discussion.replyCount = replies.length;
      discussion.voteScore = discussion.votes.upvotes.length - discussion.votes.downvotes.length;

      res.json({ discussion });

    } catch (error) {
      logger.error('Get discussion by ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve discussion',
        code: 'DISCUSSION_FETCH_ERROR'
      });
    }
  },

  async replyToDiscussion(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      // Verify parent discussion exists
      const parentDiscussion = await Discussion.findById(id);
      if (!parentDiscussion) {
        return res.status(404).json({
          error: 'Parent discussion not found',
          code: 'DISCUSSION_NOT_FOUND'
        });
      }

      const reply = new Discussion({
        caseId: parentDiscussion.caseId,
        userId: req.user._id,
        content,
        type: 'reply',
        parentId: id,
        isInstructorResponse: ['instructor', 'admin'].includes(req.user.role)
      });

      await reply.save();
      await reply.populate('userId', 'profile.firstName profile.lastName role');

      // Send real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`discussion_${parentDiscussion.caseId}`).emit('reply_added', {
          reply,
          parentId: id,
          user: {
            id: req.user._id,
            name: `${req.user.profile.firstName} ${req.user.profile.lastName}`,
            role: req.user.role
          }
        });
      }

      logger.info(`Reply created: ${reply._id} by user: ${req.user._id}`);

      res.status(201).json({
        message: 'Reply posted successfully',
        reply
      });

    } catch (error) {
      logger.error('Reply to discussion error:', error);
      res.status(500).json({
        error: 'Failed to create reply',
        code: 'REPLY_CREATE_ERROR'
      });
    }
  },

  async getCaseDiscussions(req, res) {
    try {
      const { caseId } = req.params;
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const skip = (page - 1) * limit;
      const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [discussions, totalCount] = await Promise.all([
        Discussion.find({ caseId, parentId: null })
          .populate('userId', 'profile.firstName profile.lastName role')
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Discussion.countDocuments({ caseId, parentId: null })
      ]);

      // Get replies for each discussion
      for (let discussion of discussions) {
        const replies = await Discussion.find({ parentId: discussion._id })
          .populate('userId', 'profile.firstName profile.lastName role')
          .sort({ createdAt: 1 })
          .lean();
        discussion.replies = replies;
        discussion.replyCount = replies.length;
        discussion.voteScore = discussion.votes.upvotes.length - discussion.votes.downvotes.length;
      }

      res.json({
        discussions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: skip + discussions.length < totalCount,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      logger.error('Get case discussions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve discussions',
        code: 'DISCUSSIONS_FETCH_ERROR'
      });
    }
  },

  async createDiscussion(req, res) {
    try {
      const { caseId, content, type = 'comment', parentId } = req.body;

      // Verify case exists
      const case_obj = await Case.findById(caseId);
      if (!case_obj) {
        return res.status(404).json({
          error: 'Case not found',
          code: 'CASE_NOT_FOUND'
        });
      }

      const discussion = new Discussion({
        caseId,
        userId: req.user._id,
        content,
        type,
        parentId,
        isInstructorResponse: ['instructor', 'admin'].includes(req.user.role)
      });

      await discussion.save();
      await discussion.populate('userId', 'profile.firstName profile.lastName role');

      // Send real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`discussion_${caseId}`).emit('discussion_added', {
          discussion,
          user: {
            id: req.user._id,
            name: `${req.user.profile.firstName} ${req.user.profile.lastName}`,
            role: req.user.role
          }
        });
      }

      logger.info(`Discussion created: ${discussion._id} by user: ${req.user._id}`);

      res.status(201).json({
        message: 'Discussion posted successfully',
        discussion
      });

    } catch (error) {
      logger.error('Create discussion error:', error);
      res.status(500).json({
        error: 'Failed to create discussion',
        code: 'DISCUSSION_CREATE_ERROR'
      });
    }
  },

  async voteOnDiscussion(req, res) {
    try {
      const { id } = req.params;
      const { voteType } = req.body; // 'upvote' or 'downvote'

      const discussion = await Discussion.findById(id);
      if (!discussion) {
        return res.status(404).json({
          error: 'Discussion not found',
          code: 'DISCUSSION_NOT_FOUND'
        });
      }

      const userId = req.user._id;

      // Remove existing votes by this user
      discussion.votes.upvotes = discussion.votes.upvotes.filter(id => !id.equals(userId));
      discussion.votes.downvotes = discussion.votes.downvotes.filter(id => !id.equals(userId));

      // Add new vote
      if (voteType === 'upvote') {
        discussion.votes.upvotes.push(userId);
      } else if (voteType === 'downvote') {
        discussion.votes.downvotes.push(userId);
      }

      await discussion.save();

      const voteScore = discussion.votes.upvotes.length - discussion.votes.downvotes.length;

      res.json({
        message: 'Vote recorded successfully',
        voteScore,
        upvotes: discussion.votes.upvotes.length,
        downvotes: discussion.votes.downvotes.length
      });

    } catch (error) {
      logger.error('Vote on discussion error:', error);
      res.status(500).json({
        error: 'Failed to record vote',
        code: 'VOTE_ERROR'
      });
    }
  },

  async updateDiscussion(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      const discussion = await Discussion.findById(id);
      if (!discussion) {
        return res.status(404).json({
          error: 'Discussion not found',
          code: 'DISCUSSION_NOT_FOUND'
        });
      }

      // Check if user owns the discussion
      if (discussion.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied - not discussion owner',
          code: 'NOT_OWNER'
        });
      }

      // Save edit history
      discussion.editHistory.push({
        content: discussion.content,
        editedAt: new Date(),
        reason: 'User edit'
      });

      discussion.content = content;
      discussion.isEdited = true;
      await discussion.save();

      res.json({
        message: 'Discussion updated successfully',
        discussion
      });

    } catch (error) {
      logger.error('Update discussion error:', error);
      res.status(500).json({
        error: 'Failed to update discussion',
        code: 'DISCUSSION_UPDATE_ERROR'
      });
    }
  },

  async deleteDiscussion(req, res) {
    try {
      const { id } = req.params;

      const discussion = await Discussion.findById(id);
      if (!discussion) {
        return res.status(404).json({
          error: 'Discussion not found',
          code: 'DISCUSSION_NOT_FOUND'
        });
      }

      // Check if user owns the discussion or is admin/instructor
      const canDelete = discussion.userId.toString() === req.user._id.toString() ||
                       ['admin', 'instructor'].includes(req.user.role);

      if (!canDelete) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Delete all replies first
      await Discussion.deleteMany({ parentId: id });
      
      // Delete the discussion
      await Discussion.findByIdAndDelete(id);

      logger.info(`Discussion deleted: ${id} by user: ${req.user._id}`);

      res.json({
        message: 'Discussion deleted successfully'
      });

    } catch (error) {
      logger.error('Delete discussion error:', error);
      res.status(500).json({
        error: 'Failed to delete discussion',
        code: 'DISCUSSION_DELETE_ERROR'
      });
    }
  }
};

module.exports = discussionController;