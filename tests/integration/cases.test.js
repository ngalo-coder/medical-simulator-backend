const request = require('supertest');
const { app } = require('../../server');
const Case = require('../../models/Case');

describe('Cases Endpoints', () => {
  let student, instructor, studentToken, instructorToken;

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
    instructorToken = global.testUtils.generateAuthToken(instructor);
  });

  describe('GET /api/cases', () => {
    beforeEach(async () => {
      // Create test cases
      await global.testUtils.createTestCase({
        title: 'Published Case 1',
        specialty: 'Cardiology',
        difficulty: 'beginner',
        metadata: { status: 'published' }
      });
      
      await global.testUtils.createTestCase({
        title: 'Published Case 2',
        specialty: 'Neurology',
        difficulty: 'advanced',
        metadata: { status: 'published' }
      });
      
      await global.testUtils.createTestCase({
        title: 'Draft Case',
        metadata: { status: 'draft' }
      });
    });

    it('should get published cases without authentication', async () => {
      const response = await request(app)
        .get('/api/cases')
        .expect(200);

      expect(response.body).toHaveProperty('cases');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.cases).toHaveLength(2); // Only published cases
      expect(response.body.cases.every(c => c.metadata.status === 'published')).toBe(true);
    });

    it('should filter cases by specialty', async () => {
      const response = await request(app)
        .get('/api/cases?specialty=Cardiology')
        .expect(200);

      expect(response.body.cases).toHaveLength(1);
      expect(response.body.cases[0].specialty).toBe('Cardiology');
    });

    it('should filter cases by difficulty', async () => {
      const response = await request(app)
        .get('/api/cases?difficulty=beginner')
        .expect(200);

      expect(response.body.cases).toHaveLength(1);
      expect(response.body.cases[0].difficulty).toBe('beginner');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/cases?page=1&limit=1')
        .expect(200);

      expect(response.body.cases).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalPages).toBe(2);
      expect(response.body.pagination.hasNext).toBe(true);
    });

    it('should search cases by text', async () => {
      const response = await request(app)
        .get('/api/cases?search=Cardiology')
        .expect(200);

      expect(response.body.cases).toHaveLength(1);
      expect(response.body.cases[0].specialty).toBe('Cardiology');
    });
  });

  describe('GET /api/cases/:id', () => {
    let publishedCase, draftCase;

    beforeEach(async () => {
      publishedCase = await global.testUtils.createTestCase({
        metadata: { status: 'published' }
      });
      draftCase = await global.testUtils.createTestCase({
        metadata: { status: 'draft', author: instructor._id }
      });
    });

    it('should get published case with authentication', async () => {
      const response = await request(app)
        .get(`/api/cases/${publishedCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body._id).toBe(publishedCase._id.toString());
      expect(response.body.title).toBe(publishedCase.title);
    });

    it('should not get case without authentication', async () => {
      const response = await request(app)
        .get(`/api/cases/${publishedCase._id}`)
        .expect(401);

      expect(response.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should allow author to access draft case', async () => {
      const response = await request(app)
        .get(`/api/cases/${draftCase._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body._id).toBe(draftCase._id.toString());
    });

    it('should not allow non-author to access draft case', async () => {
      const response = await request(app)
        .get(`/api/cases/${draftCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('code', 'CASE_ACCESS_DENIED');
    });

    it('should return 404 for non-existent case', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/cases/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('code', 'CASE_NOT_FOUND');
    });
  });

  describe('POST /api/cases', () => {
    const validCaseData = {
      title: 'New Test Case',
      description: 'A new test case for testing',
      specialty: 'Emergency Medicine',
      bodySystem: ['Cardiovascular'],
      difficulty: 'intermediate',
      estimatedDuration: 45,
      patient: {
        name: 'Jane Doe',
        age: 35,
        gender: 'female'
      },
      presentation: {
        chiefComplaint: 'Shortness of breath',
        historyOfPresentIllness: 'Patient presents with acute shortness of breath'
      },
      simulationSteps: [{
        stepId: 'step1',
        title: 'Initial Assessment',
        description: 'Assess the patient',
        question: 'What is your first action?',
        options: [{
          optionId: 'a',
          text: 'Check vital signs',
          explanation: 'Correct approach',
          isCorrect: true
        }],
        correctAnswer: 'a',
        score: 10
      }],
      diagnostics: {
        finalDiagnosis: 'Acute Heart Failure'
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
        prognosis: 'Good with treatment',
        complications: [],
        discharge: {
          criteria: [],
          instructions: [],
          medications: [],
          followUpInstructions: ''
        }
      },
      metadata: {
        estimatedDuration: 45
      }
    };

    it('should create case as instructor', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(validCaseData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Case created successfully');
      expect(response.body.case.title).toBe(validCaseData.title);
      expect(response.body.case.metadata.author).toBe(instructor._id.toString());
      expect(response.body.case.metadata.status).toBe('draft');
    });

    it('should not create case as student', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validCaseData)
        .expect(403);

      expect(response.body).toHaveProperty('code', 'INSUFFICIENT_PERMISSIONS');
    });

    it('should not create case without authentication', async () => {
      const response = await request(app)
        .post('/api/cases')
        .send(validCaseData)
        .expect(401);

      expect(response.body).toHaveProperty('code', 'NO_TOKEN');
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validCaseData };
      delete invalidData.title;

      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('PUT /api/cases/:id', () => {
    let testCase;

    beforeEach(async () => {
      testCase = await global.testUtils.createTestCase({
        metadata: { author: instructor._id, status: 'draft' }
      });
    });

    it('should update case as author', async () => {
      const updates = {
        title: 'Updated Case Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/cases/${testCase._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Case updated successfully');
      expect(response.body.case.title).toBe(updates.title);
    });

    it('should not update case as non-author', async () => {
      const updates = { title: 'Unauthorized Update' };

      const response = await request(app)
        .put(`/api/cases/${testCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updates)
        .expect(403);

      expect(response.body).toHaveProperty('code', 'ACCESS_DENIED');
    });
  });

  describe('DELETE /api/cases/:id', () => {
    let testCase;

    beforeEach(async () => {
      testCase = await global.testUtils.createTestCase({
        metadata: { author: instructor._id, status: 'draft' }
      });
    });

    it('should delete case as author', async () => {
      const response = await request(app)
        .delete(`/api/cases/${testCase._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Case deleted successfully');

      // Verify case is deleted
      const deletedCase = await Case.findById(testCase._id);
      expect(deletedCase).toBeNull();
    });

    it('should not delete case as non-author', async () => {
      const response = await request(app)
        .delete(`/api/cases/${testCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('code', 'ACCESS_DENIED');
    });
  });

  describe('PATCH /api/cases/:id/publish', () => {
    let testCase;

    beforeEach(async () => {
      testCase = await global.testUtils.createTestCase({
        metadata: { author: instructor._id, status: 'draft' }
      });
    });

    it('should publish case as author', async () => {
      const response = await request(app)
        .patch(`/api/cases/${testCase._id}/publish`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Case published successfully');
      expect(response.body.case.metadata.status).toBe('published');
    });

    it('should not publish case as non-author', async () => {
      const response = await request(app)
        .patch(`/api/cases/${testCase._id}/publish`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('code', 'ACCESS_DENIED');
    });
  });
});