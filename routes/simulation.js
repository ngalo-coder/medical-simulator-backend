const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * /api/simulation/start/{caseId}:
 *   post:
 *     summary: Start a new simulation session
 *     tags: [Simulation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID to simulate
 *     responses:
 *       200:
 *         description: Simulation session started
 *       404:
 *         description: Case not found
 */
router.post('/start/:caseId', authenticateToken, simulationController.startSimulation);

router.post('/step/:sessionId', authenticateToken, simulationController.processStep);
router.get('/session/:sessionId', authenticateToken, simulationController.getSession);
router.patch('/session/:sessionId/pause', authenticateToken, simulationController.pauseSession);
router.patch('/session/:sessionId/resume', authenticateToken, simulationController.resumeSession);
router.patch('/session/:sessionId/abandon', authenticateToken, simulationController.abandonSession);
router.post('/session/:sessionId/feedback', authenticateToken, simulationController.submitFeedback);

module.exports = router;