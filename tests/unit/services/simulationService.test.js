const simulationService = require('../../../services/simulationService');
const { Case, Progress, User } = require('../../../models');

describe('Simulation Service', () => {
  let user, testCase;

  beforeEach(async () => {
    user = await global.testUtils.createTestUser();
    testCase = await global.testUtils.createTestCase({
      metadata: { status: 'published' }
    });
  });

  describe('createSimulationSession', () => {
    it('should create a simulation session successfully', async () => {
      const session = await simulationService.createSimulationSession(
        user._id, 
        testCase._id
      );

      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('case');
      expect(session.case.title).toBe(testCase.title);

      // Verify progress record was created
      const progress = await Progress.findOne({ 
        userId: user._id, 
        caseId: testCase._id 
      });
      expect(progress).toBeTruthy();
      expect(progress.status).toBe('started');
    });

    it('should throw error for non-existent case', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      await expect(
        simulationService.createSimulationSession(user._id, fakeId)
      ).rejects.toThrow('Case not found or not available');
    });

    it('should throw error for unpublished case', async () => {
      const draftCase = await global.testUtils.createTestCase({
        metadata: { status: 'draft' }
      });

      await expect(
        simulationService.createSimulationSession(user._id, draftCase._id)
      ).rejects.toThrow('Case not found or not available');
    });
  });

  describe('processSimulationStep', () => {
    let sessionId, progress;

    beforeEach(async () => {
      const session = await simulationService.createSimulationSession(
        user._id, 
        testCase._id
      );
      sessionId = session.sessionId;
      progress = await Progress.findOne({ sessionId });
    });

    it('should process a correct answer', async () => {
      const result = await simulationService.processSimulationStep(
        sessionId,
        'step1',
        'a',
        30
      );

      // Refresh progress from database
      const updatedProgress = await Progress.findOne({ sessionId });
      
      expect(updatedProgress.stepPerformance).toHaveLength(1);
      expect(updatedProgress.stepPerformance[0].isCorrect).toBe(true);
      expect(updatedProgress.stepPerformance[0].score).toBe(10);
      expect(updatedProgress.score).toBe(10);
      expect(updatedProgress.stepsCompleted).toBe(1);
    });

    it('should complete simulation when all steps are done', async () => {
      const result = await simulationService.processSimulationStep(
        sessionId,
        'step1',
        'a',
        30
      );

      expect(result).toHaveProperty('completed', true);
      expect(result).toHaveProperty('summary');
      expect(result.summary.finalScore).toBe(10);

      // Verify progress is marked as completed
      const completedProgress = await Progress.findOne({ sessionId });
      expect(completedProgress.status).toBe('completed');
    });

    it('should handle incorrect answers', async () => {
      // Add an incorrect option to the test case
      testCase.simulationSteps[0].options.push({
        optionId: 'b',
        text: 'Incorrect Option',
        explanation: 'This is wrong',
        isCorrect: false
      });
      await testCase.save();

      const result = await simulationService.processSimulationStep(
        sessionId,
        'step1',
        'b',
        30
      );

      const updatedProgress = await Progress.findOne({ sessionId });
      expect(updatedProgress.stepPerformance[0].isCorrect).toBe(false);
      expect(updatedProgress.stepPerformance[0].score).toBe(0);
    });
  });

  describe('pauseSimulation', () => {
    it('should pause simulation successfully', async () => {
      const session = await simulationService.createSimulationSession(
        user._id, 
        testCase._id
      );

      const result = await simulationService.pauseSimulation(
        session.sessionId, 
        user._id
      );

      expect(result.message).toBe('Simulation paused successfully');

      const progress = await Progress.findOne({ sessionId: session.sessionId });
      expect(progress.status).toBe('paused');
    });
  });

  describe('resumeSimulation', () => {
    it('should resume simulation successfully', async () => {
      const session = await simulationService.createSimulationSession(
        user._id, 
        testCase._id
      );

      await simulationService.pauseSimulation(session.sessionId, user._id);
      
      const result = await simulationService.resumeSimulation(
        session.sessionId, 
        user._id
      );

      expect(result.message).toBe('Simulation resumed successfully');

      const progress = await Progress.findOne({ sessionId: session.sessionId });
      expect(progress.status).toBe('started');
    });
  });

  describe('abandonSimulation', () => {
    it('should abandon simulation successfully', async () => {
      const session = await simulationService.createSimulationSession(
        user._id, 
        testCase._id
      );

      const result = await simulationService.abandonSimulation(
        session.sessionId, 
        user._id
      );

      expect(result.message).toBe('Simulation abandoned');

      const progress = await Progress.findOne({ sessionId: session.sessionId });
      expect(progress.status).toBe('abandoned');
      expect(progress.endTime).toBeTruthy();
    });
  });

  describe('generateCompletionSummary', () => {
    it('should generate correct completion summary', () => {
      const mockProgress = {
        sessionId: 'test-session',
        score: 80,
        maxPossibleScore: 100,
        percentageScore: 80,
        timeSpent: 1800,
        stepsCompleted: 8,
        totalSteps: 10,
        stepPerformance: [
          { isCorrect: true },
          { isCorrect: true },
          { isCorrect: false },
          { isCorrect: true }
        ]
      };

      const mockCase = {
        title: 'Test Case',
        specialty: 'Internal Medicine',
        metadata: { estimatedDuration: 30 }
      };

      const summary = simulationService.generateCompletionSummary(
        mockProgress, 
        mockCase
      );

      expect(summary.finalScore).toBe(80);
      expect(summary.percentageScore).toBe(80);
      expect(summary.accuracy).toBe(75); // 3 out of 4 correct
      expect(summary.performance).toBe('Good');
      expect(summary.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('getPerformanceLevel', () => {
    it('should return correct performance levels', () => {
      expect(simulationService.getPerformanceLevel(95)).toBe('Excellent');
      expect(simulationService.getPerformanceLevel(85)).toBe('Good');
      expect(simulationService.getPerformanceLevel(75)).toBe('Satisfactory');
      expect(simulationService.getPerformanceLevel(65)).toBe('Needs Improvement');
      expect(simulationService.getPerformanceLevel(45)).toBe('Poor');
    });
  });
});