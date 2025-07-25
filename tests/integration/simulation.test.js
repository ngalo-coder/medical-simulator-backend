const request = require('supertest');
const { app } = require('../../server');
const { Case, Progress } = require('../../models');

describe('Simulation Endpoints', () => {
  let student, instructor, studentToken, testCase;

  beforeEach(async () => {
    student = await global.testUtils.createTestUser({
      email: 'student@example.com',
      role: 'student'
    });
    instructor = await global.testUtils.createTestUser({
      email: 'instructor@example.com',
      role: 'instructor'
    });
    
    studentToken = global.testUtils.generateAuthToken(student);
    
    testCase = await global.testUtils.createTestCase({
      metadata: { status: 'published', author: instructor._id }
    });
  });

  describe('POST /api/simulation/start/:caseId', () => {
    it('should start simulation session successfully', async () => {
      const response = await request(app)
        .post(`/api/simulation/start/${testCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Simulation session started successfully');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('case');
      expect(response.body.case.title).toBe(testCase.title);

      // Verify progress record was created
      const progress = await Progress.findOne({ 
        userId: student._id, 
        caseId: testCase._id 
      });
      expect(progress).toBeTruthy();
      expect(progress.status).toBe('started');
    });

    it('should not start simulation without authentication', async () => {
      const response = await request(app)
        .post(`/api/simulation/start/${testCase._id}`)
        .expect(401);

      expect(response.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should not start simulation for non-existent case', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post(`/api/simulation/start/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('code', 'SIMULATION_START_ERROR');
    });

    it('should not start simulation for unpublished case', async () => {
      const draftCase = await global.testUtils.createTestCase({
        metadata: { status: 'draft', author: instructor._id }
      });

      const response = await request(app)
        .post(`/api/simulation/start/${draftCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(500);

      expect(response.body.error).toContain('Case not found or not available');
    });
  });

  describe('POST /api/simulation/step/:sessionId', () => {
    let sessionId;

    beforeEach(async () => {
      const startResponse = await request(app)
        .post(`/api/simulation/start/${testCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      sessionId = startResponse.body.sessionId;
    });

    it('should process simulation step successfully', async () => {
      const stepData = {
        currentStepId: 'step1',
        selectedOption: 'a',
        timeSpent: 30
      };

      const response = await request(app)
        .post(`/api/simulation/step/${sessionId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(stepData)
        .expect(200);

      expect(response.body).toHaveProperty('completed', true);
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary.finalScore).toBe(10);

      // Verify progress was updated
      const progress = await Progress.findOne({ sessionId });
      expect(progress.stepPerformance).toHaveLength(1);
      expect(progress.stepPerformance[0].isCorrect).toBe(true);
      expect(progress.status).toBe('completed');
    });

    it('should handle incorrect answers', async () => {
      // Add incorrect option to test case
      testCase.simulationSteps[0].options.push({
        optionId: 'b',
        text: 'Incorrect Option',
        explanation: 'This is wrong',
        isCorrect: false
      });
      await testCase.save();

      const stepData = {
        currentStepId: 'step1',
        selectedOption: 'b',
        timeSpent: 45
      };

      const response = await request(app)
        .post(`/api/simulation/step/${sessionId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(stepData)
        .expect(200);

      const progress = await Progress.findOne({ sessionId });
      expect(progress.stepPerformance[0].isCorrect).toBe(false);
      expect(progress.stepPerformance[0].score).toBe(0);
    });

    it('should not process step without authentication', async () => {
      const response = await request(app)
        .post(`/api/simulation/step/${sessionId}`)
        .send({ currentStepId: 'step1', selectedOption: 'a' })
        .expect(401);

      expect(response.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should not process step for invalid session', async () => {
      const fakeSessionId = 'fake_session_id';
      const response = await request(app)
        .post(`/api/simulation/step/${fakeSessionId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ currentStepId: 'step1', selectedOption: 'a' })
        .expect(500);

      expect(response.body.error).toContain('Session not found or expired');
    });
  });

  describe('GET /api/simulation/session/:sessionId', () => {
    let sessionId;

    beforeEach(async () => {
      const startResponse = await request(app)
        .post(`/api/simulation/start/${testCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      sessionId = startResponse.body.sessionId;
    });

    it('should get session status successfully', async () => {
      const response = await request(app)
        .get(`/api/simulation/session/${sessionId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('progress');
      expect(response.body.session.sessionId).toBe(sessionId);
      expect(response.body.progress.status).toBe('started');
    });

    it('should not get session without authentication', async () => {
      const response = await request(app)
        .get(`/api/simulation/session/${sessionId}`)
        .expect(401);

      expect(response.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = 'fake_session_id';
      const response = await request(app)
        .get(`/api/simulation/session/${fakeSessionId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('code', 'SESSION_NOT_FOUND');
    });
  });

  describe('PATCH /api/simulation/session/:sessionId/pause', () => {
    let sessionId;

    beforeEach(async () => {
      const startResponse = await request(app)
        .post(`/api/simulation/start/${testCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      sessionId = startResponse.body.sessionId;
    });

    it('should pause session successfully', async () => {
      const response = await request(app)
        .patch(`/api/simulation/session/${sessionId}/pause`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.message).toBe('Simulation paused successfully');

      // Verify session was paused
      const progress = await Progress.findOne({ sessionId });
      expect(progress.status).toBe('paused');
    });

    it('should not pause session without authentication', async () => {
      const response = await request(app)
        .patch(`/api/simulation/session/${sessionId}/pause`)
        .expect(401);

      expect(response.body).toHaveProperty('code', 'NO_TOKEN');
    });
  });

  describe('PATCH /api/simulation/session/:sessionId/resume', () => {
    let sessionId;

    beforeEach(async () => {
      const startResponse = await request(app)
        .post(`/api/simulation/start/${testCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      sessionId = startResponse.body.sessionId;

      // Pause the session first
      await request(app)
        .patch(`/api/simulation/session/${sessionId}/pause`)
        .set('Authorization', `Bearer ${studentToken}`);
    });

    it('should resume session successfully', async () => {
      const response = await request(app)
        .patch(`/api/simulation/session/${sessionId}/resume`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.message).toBe('Simulation resumed successfully');

      // Verify session was resumed
      const progress = await Progress.findOne({ sessionId });
      expect(progress.status).toBe('started');
    });
  });

  describe('PATCH /api/simulation/session/:sessionId/abandon', () => {
    let sessionId;

    beforeEach(async () => {
      const startResponse = await request(app)
        .post(`/api/simulation/start/${testCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      sessionId = startResponse.body.sessionId;
    });

    it('should abandon session successfully', async () => {
      const response = await request(app)
        .patch(`/api/simulation/session/${sessionId}/abandon`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.message).toBe('Simulation abandoned');

      // Verify session was abandoned
      const progress = await Progress.findOne({ sessionId });
      expect(progress.status).toBe('abandoned');
      expect(progress.endTime).toBeTruthy();
    });
  });

  describe('POST /api/simulation/session/:sessionId/feedback', () => {
    let sessionId;

    beforeEach(async () => {
      const startResponse = await request(app)
        .post(`/api/simulation/start/${testCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      sessionId = startResponse.body.sessionId;
    });

    it('should submit feedback successfully', async () => {
      const feedbackData = {
        rating: 4,
        difficulty: 'just_right',
        comments: 'Great case! Very educational.',
        wouldRecommend: true
      };

      const response = await request(app)
        .post(`/api/simulation/session/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(feedbackData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Feedback submitted successfully');
      expect(response.body.feedback.rating).toBe(4);
      expect(response.body.feedback.comments).toBe(feedbackData.comments);

      // Verify feedback was stored
      const progress = await Progress.findOne({ sessionId });
      expect(progress.userFeedback.rating).toBe(4);
      expect(progress.userFeedback.wouldRecommend).toBe(true);
    });

    it('should not submit feedback without authentication', async () => {
      const response = await request(app)
        .post(`/api/simulation/session/${sessionId}/feedback`)
        .send({ rating: 5 })
        .expect(401);

      expect(response.body).toHaveProperty('code', 'NO_TOKEN');
    });
  });
});