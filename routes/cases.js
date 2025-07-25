const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { authorize, authorizeOwnership } = require('../middleware/authorization');
const { validate, schemas } = require('../middleware/validation');

// Swagger documentation for get cases endpoint
/**
 * @swagger
 * /api/cases:
 *   get:
 *     summary: Get all published cases
 *     tags: [Cases]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of cases
 */
router.get('/', optionalAuth, validate('queryParams'), caseController.getCases);

// Swagger documentation for get case by ID endpoint
/**
 * @swagger
 * /api/cases/{id}:
 *   get:
 *     summary: Get a case by ID
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Case details
 *       404:
 *         description: Case not found
 */
router.get('/:id', authenticateToken, caseController.getCaseById);

// Create case
router.post('/', authenticateToken, authorize('instructor', 'admin'), validate('case'), caseController.createCase);

// Update case
router.put('/:id', authenticateToken, authorizeOwnership(), validate('case'), caseController.updateCase);

// Delete case
router.delete('/:id', authenticateToken, authorizeOwnership(), caseController.deleteCase);

// Publish case
router.patch('/:id/publish', authenticateToken, authorizeOwnership(), caseController.publishCase);

// Archive case
router.patch('/:id/archive', authenticateToken, authorizeOwnership(), caseController.archiveCase);

// Get case statistics
router.get('/:id/statistics', authenticateToken, caseController.getCaseStatistics);

// Duplicate case
router.post('/:id/duplicate', authenticateToken, authorize('instructor', 'admin'), caseController.duplicateCase);

module.exports = router;