const Case = require('../models/Case');
const Progress = require('../models/Progress');
const Review = require('../models/Review');
const logger = require('../utils/logger');

const getCases = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      specialty,
      difficulty,
      bodySystem,
      tags,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { 'metadata.status': 'published' };
    if (specialty) filter.specialty = specialty;
    if (difficulty) filter.difficulty = difficulty;
    if (bodySystem) filter.bodySystem = { $in: bodySystem.split(',') };
    if (tags) filter.tags = { $in: tags.split(',') };
    if (search) {
      filter.$text = { $search: search };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;
    const [cases, totalCount] = await Promise.all([
      Case.find(filter).sort(sort).skip(skip).limit(parseInt(limit))
        .populate('metadata.author', 'profile.firstName profile.lastName profile.institution')
        .lean(),
      Case.countDocuments(filter)
    ]);

    res.json({
      cases,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: skip + cases.length < totalCount,
        hasPrev: page > 1
      },
      filters: { specialty, difficulty, bodySystem, tags, search }
    });
  } catch (error) {
    logger.error('Get cases error:', error);
    res.status(500).json({
      error: 'Failed to retrieve cases',
      code: 'CASES_FETCH_ERROR'
    });
  }
};

const getCaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const case_data = await Case.findById(id)
      .populate('metadata.author', 'profile.firstName profile.lastName profile.institution')
      .populate('metadata.reviewers', 'profile.firstName profile.lastName');

    if (!case_data) {
      return res.status(404).json({
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    // Check access permissions
    const canAccess =
      case_data.metadata.status === 'published' ||
      case_data.metadata.author._id.toString() === req.user._id.toString() ||
      ['instructor', 'admin'].includes(req.user.role);

    if (!canAccess) {
      return res.status(403).json({
        error: 'Access denied to this case',
        code: 'CASE_ACCESS_DENIED'
      });
    }

    // Increment view count for published cases
    if (case_data.metadata.status === 'published') {
      await case_data.incrementViewCount();
    }

    res.json(case_data);
  } catch (error) {
    logger.error('Get case by ID error:', error);
    res.status(500).json({
      error: 'Failed to retrieve case',
      code: 'CASE_FETCH_ERROR'
    });
  }
};

const createCase = async (req, res) => {
  try {
    const caseData = {
      ...req.body,
      metadata: {
        ...req.body.metadata,
        author: req.user._id,
        status: 'draft'
      }
    };

    const newCase = new Case(caseData);
    await newCase.save();

    logger.info(`New case created: ${newCase._id} by user: ${req.user._id}`);
    res.status(201).json({
      message: 'Case created successfully',
      case: newCase
    });
  } catch (error) {
    logger.error('Create case error:', error);
    res.status(500).json({
      error: 'Failed to create case',
      code: 'CASE_CREATE_ERROR'
    });
  }
};

const updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const case_obj = await Case.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!case_obj) {
      return res.status(404).json({
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    logger.info(`Case updated: ${id} by user: ${req.user._id}`);
    res.json({
      message: 'Case updated successfully',
      case: case_obj
    });
  } catch (error) {
    logger.error('Update case error:', error);
    res.status(500).json({
      error: 'Failed to update case',
      code: 'CASE_UPDATE_ERROR'
    });
  }
};

const deleteCase = async (req, res) => {
  try {
    const { id } = req.params;
    const case_obj = await Case.findByIdAndDelete(id);

    if (!case_obj) {
      return res.status(404).json({
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    logger.info(`Case deleted: ${id} by user: ${req.user._id}`);
    res.json({
      message: 'Case deleted successfully',
      case: case_obj
    });
  } catch (error) {
    logger.error('Delete case error:', error);
    res.status(500).json({
      error: 'Failed to delete case',
      code: 'CASE_DELETE_ERROR'
    });
  }
};

const publishCase = async (req, res) => {
  try {
    const { id } = req.params;
    const case_obj = await Case.findByIdAndUpdate(
      id,
      { 'metadata.status': 'published' },
      { new: true }
    );

    if (!case_obj) {
      return res.status(404).json({
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    logger.info(`Case published: ${id} by user: ${req.user._id}`);
    res.json({
      message: 'Case published successfully',
      case: case_obj
    });
  } catch (error) {
    logger.error('Publish case error:', error);
    res.status(500).json({
      error: 'Failed to publish case',
      code: 'CASE_PUBLISH_ERROR'
    });
  }
};

const archiveCase = async (req, res) => {
  try {
    const { id } = req.params;
    const case_obj = await Case.findByIdAndUpdate(
      id,
      { 'metadata.status': 'archived' },
      { new: true }
    );

    res.json({
      message: 'Case archived successfully',
      case: case_obj
    });
  } catch (error) {
    logger.error('Archive case error:', error);
    res.status(500).json({
      error: 'Failed to archive case',
      code: 'CASE_ARCHIVE_ERROR'
    });
  }
};

const getCaseStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const [progressData, reviews] = await Promise.all([
      Progress.find({ caseId: id, status: 'completed' }).lean(),
      Review.find({ caseId: id }).lean()
    ]);

    const analytics = {
      totalAttempts: progressData.length,
      averageScore: progressData.length > 0 ?
        progressData.reduce((sum, p) => sum + p.percentageScore, 0) / progressData.length :
        0,
      averageTime: progressData.length > 0 ?
        progressData.reduce((sum, p) => sum + p.timeSpent, 0) / progressData.length :
        0,
      averageRating: reviews.length > 0 ?
        reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length :
        0
    };

    res.json(analytics);
  } catch (error) {
    logger.error('Get case statistics error:', error);
    res.status(500).json({
      error: 'Failed to get case statistics',
      code: 'CASE_STATS_ERROR'
    });
  }
};

const duplicateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const originalCase = await Case.findById(id);
    if (!originalCase) {
      return res.status(404).json({
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    // Create duplicate
    const duplicateData = originalCase.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    duplicateData.title = `${duplicateData.title} (Copy)`;
    duplicateData.metadata.author = req.user._id;
    duplicateData.metadata.status = 'draft';
    duplicateData.metadata.version = 1;

    const duplicateCase = new Case(duplicateData);
    await duplicateCase.save();

    logger.info(`Case duplicated: ${id} -> ${duplicateCase._id} by user: ${req.user._id}`);
    res.status(201).json({
      message: 'Case duplicated successfully',
      case: duplicateCase
    });
  } catch (error) {
    logger.error('Duplicate case error:', error);
    res.status(500).json({
      error: 'Failed to duplicate case',
      code: 'CASE_DUPLICATE_ERROR'
    });
  }
};

module.exports = {
  getCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  publishCase,
  archiveCase,
  getCaseStatistics,
  duplicateCase
};