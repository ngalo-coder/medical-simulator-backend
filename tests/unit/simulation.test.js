const simulationService = require('../../services/simulationService');
const { Case, Progress, User } = require('../../models');

// Mock Redis utils
jest.mock('../../config/redis', () => ({
  redisUtils: {
    set: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(true)
  }
}));

describe('Simulation Service', () => {
  let student, instructor, testCase;

  beforeEach(async () => {
    student = await global.testUtils.createTestUser({
      role: 'student',
      email: 'student@example.com'
    });

    instructor = await global.testUtils.createTestUser({
      role: 'instructor',
      email: 'instructor@example.com'
    });

    testCase = new Case({
      title: 'Simulation Test Case',
      description: 'A case for testing simulation service',
      specialty: 'Internal Medicine',
      bodySystem: ['Cardiovascular'],
      difficulty: 'intermediate',
      estimatedDuration: 30,
      patient: {
        name: 'John Doe',
        age: 45,
        gender: 'male'
      },
      presentation: {
        chiefComplaint: 'Chest pain',
        historyOfPresentIllness: 'Patient presents with chest pain'
      },
      simulationSteps: [
        {
          stepId: 'step1',
          title: 'Initial Assessment',
          description: 'Assess the patient',
          question: 'What is your primary concern?',
          options: [
            { id: 'a', text: 'MI', isCorrect: true, points: 10 },
            { id: 'b', text: 'PE', isCorrect: false, points: 0 }
          ],
          correctAnswer: 'a',
          score: 10
        },
        {
          stepId: 'step2',
          title: 'Treatment',
          description: 'Choose treatment',
          question: 'What treatment would you give?',
          options: [
            { id: 'a', text: 'Aspirin', isCorrect: true, points: 10 },
            { id: 'b', text: 'Antibiotics', isCorrect: false, points: 0 }
          ],
          correctAnswer: 'a',
          score: 10
        }
      ],
      diagnostics: {
        finalDiagnosis: 'Myocardial Infarction'
      },
      treatment: {
        immediate: [],
        ongoing: [],
        lifestyle: [],
        followUp: {
          timeline: '1 week',
          specialty: [],
          tests: [],
          education: []
        },
        prognosis: 'Good',
        complications: [],
        discharge: {
          criteria: [],
          instructions: [],
          medications: [],
          followUpInstructions: ''
        }
      },
      metadata: {
        author: instructor._id,
        status: 'published',
        estimatedDuration: 30,
        maxScore: 20
      }
    });

    await testCase.save();
  });

  describe('createSimulationSession', () => {
    it('should create a new simulation session successfully', async () => {
      const session = await simulationService.createSimulationSession(
        student._id,
        testCase._id
      );

      expect(session.sessionId).toBeDefined();
      expect(session.case.id).toBe(testCase._id.toString());
      expect(session.case.title).toBe(testCase.title);

      // Verify progress record was created
      const progress = await Progress.findOne({ sessionId: session.sessionId });
      expect(progress).toBeTruthy();
      expect(progress.userId.toString()).toBe(student._id.toString());
      expect(progress.status).toBe('started');
    });

    it('should reject non-published cases', async () => {
      testCase.metadata.status = 'draft';
      await testCase.save();

      await expect(
        simulationService.createSimulationSession(student._id, testCase._id)
      ).rejects.toThrow('Case not found or not available');
    });

    it('should reject non-existent cases', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      await expect(
        simulationService.createSimulationSession(student._id, fakeId)
      ).rejects.toThrow('Case not found or not available');
    });
  });

  describe('processSimulationStep', () => {
    let sessionId, progress;

    beforeEach(async () => {
      const session = await simulationService.createSimulationSession(
        student._id,
        testCase._id
      );
      sessionId = session.sessionId;
      progress = await Progress.findOne({ sessionId });
    });

    it('should process a correct answer successfully', async () => {
      // Mock Redis session data
      const { redisUtils } = require('../../config/redis');
      redisUtils.get.mockResolvedValueOnce({
        sessionId,
        userId: student._id,
        caseId: testCase._id,
        currentStepIndex: 0,
        totalSteps: 2
      });

      const result = await simulationService.processSimulationStep(
        sessionId,
        'step1',
        'a',
        30
      );

      expect(result.step).toBeDefined();
      expect(result.step.stepId).toBe('step2');
      expect(result.progress.stepsCompleted).toBe(1);
      expect(result.progress.currentScore).toBe(10);

      // Verify progress was updated
      const updatedProgress = await Progress.findOne({ sessionId });
      expect(updatedProgress.stepsCompleted).toBe(1);
      expect(updatedProgress.score).toBe(10);
    });

    it('should process an incorrect answer', async () => {
      const { redisUtils } = require('../../config/redis');
      redisUtils.get.mockResolvedValueOnce({
        sessionId,
        userId: student._id,
        caseId: testCase._id,
        currentStepIndex: 0,
        totalSteps: 2
      });

      const result = await simulationService.processSimulationStep(
        sessionId,
        'step1',
        'b', // Wrong answer
        45
      );

      expect(result.step.stepId).toBe('step2');
      expect(result.progress.currentScore).toBe(0);

      const updatedProgress = await Progress.findOne({ sessionId });
      expect(updatedProgress.score).toBe(0);
      expect(updatedProgress.stepPerformance[0].isCorrect).toBe(false);
    });

    it('should complete simulation when all steps are done', async () => {
      const { redisUtils } = require('../../config/redis');
      
      // Process first step
      redisUtils.get.mockResolvedValueOnce({
        sessionId,
        userId: student._id,
        caseId: testCase._id,
        currentStepIndex: 0,
        totalSteps: 2
      });

      await simulationService.processSimulationStep(sessionId, 'step1', 'a', 30);

      // Process second step
      redisUtils.get.mockResolvedValueOnce({
        sessionId,
        userId: student._id,
        caseId: testCase._id,
        currentStepIndex: 1,
        totalSteps: 2
      });

      const result = await simulationService.processSimulationStep(
        sessionId,
        'step2',
        'a',
        45
      );

      expect(result.completed).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.finalScore).toBe(20);
      expect(result.summary.percentageScore).toBe(100);

      // Verify progress is marked as completed
      const completedProgress = await Progress.findOne({ sessionId });
      expect(completedProgress.status).toBe('completed');
    });

    it('should handle invalid session ID', async () => {
      const { redisUtils } = require('../../config/redis');
      redisUtils.get.mockResolvedValueOnce(null);

      await expect(
        simulationService.processSimulationStep('invalid-session', 'step1', 'a')
      ).rejects.toThrow('Session not found or expired');
    });
  });

  describe('pauseSimulation', () => {
    let sessionId;

    beforeEach(async () => {
      const session = await simulationService.createSimulationSession(
        student._id,
        testCase._id
      );
      sessionId = session.sessionId;
    });

    it('should pause simulation successfully', async () => {
      const result = await simulationService.pauseSimulation(sessionId, student._id);
      
      expect(result.message).toBe('Simulation paused successfully');

      const progress = await Progress.findOne({ sessionId });
      expect(progress.status).toBe('paused');
    });
  });

  describe('resumeSimulation', () => {
    let sessionId;

    beforeEach(async () => {
      const session = await simulationService.createSimulationSession(
        student._id,
        testCase._id
      );
      sessionId = session.sessionId;
      
      // Pause first
      await simulationService.pauseSimulation(sessionId, student._id);
    });

    it('should resume simulation successfully', async () => {
      const result = await simulationService.resumeSimulation(sessionId, student._id);
      
      expect(result.message).toBe('Simulation resumed successfully');

      const progress = await Progress.findOne({ sessionId });
      expect(progress.status).toBe('started');
    });
  });

  describe('abandonSimulation', () => {
    let sessionId;

    beforeEach(async () => {
      const session = await simulationService.createSimulationSession(
        student._id,
        testCase._id
      );
      sessionId = session.sessionId;
    });

    it('should abandon simulation successfully', async () => {
      const result = await simulationService.abandonSimulation(sessionId, student._id);
      
      expect(result.message).toBe('Simulation abandoned');

      const progress = await Progress.findOne({ sessionId });
      expect(progress.status).toBe('abandoned');
      expect(progress.endTime).toBeDefined();
    });
  });

  describe('generateCompletionSummary', () => {
    it('should generate correct completion summary', async () => {
      const mockProgress = {
        sessionId: 'test-session',
        score: 15,
        maxPossibleScore: 20,
        percentageScore: 75,
        timeSpent: 1200,
        stepsCompleted: 2,
        totalSteps: 2,
        stepPerformance: [
          { isCorrect: true },
          { isCorrect: false }
        ]
      };

      const mockCase = {
        title: 'Test Case',
        specialty: 'Internal Medicine'
      };

      const summary = simulationService.generateCompletionSummary(mockProgress, mockCase);

      expect(summary.sessionId).toBe('test-session');
      expect(summary.finalScore).toBe(15);
      expect(summary.percentageScore).toBe(75);
      expect(summary.accuracy).toBe(50); // 1 correct out of 2
      expect(summary.performance).toBe('Satisfactory');
      expect(summary.recommendations).toBeDefined();
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