const request = require('supertest');
const { app } = require('../../server');
const Case = require('../../models/Case');

describe('Cases API', () => {
  let student, instructor, admin;
  let studentToken, instructorToken, adminToken;

  beforeEach(async () => {
    student = await global.testUtils.createTestUser({ role: 'student' });
    instructor = await global.testUtils.createTestUser({ 
      role: 'instructor', 
      email: 'instructor@example.com' 
    });
    admin = await global.testUtils.createTestUser({ 
      role: 'admin', 
      email: 'admin@example.com' 
    });

    studentToken = global.testUtils.generateAuthToken(student);
    instructorToken = global.testUtils.generateAuthToken(instructor);
    adminToken = global.testUtils.generateAuthToken(admin);
  });

  describe('GET /api/cases', () => {
    beforeEach(async () => {
      // Create test cases
      await Case.create({
        title: 'Published Case',
        description: 'A published test case',
        specialty: 'Internal Medicine',
        bodySystem: ['Cardiovascular'],
        difficulty: 'beginner',
        estimatedDuration: 30,
        patient: { name: 'Test Patient', age: 45, gender: 'male' },
        presentation: { 
          chiefComplaint: 'Chest pain',
          historyOfPresentIllness: 'Patient presents with chest pain'
        },
        simulationSteps: [],
        diagnostics: { finalDiagnosis: 'Test Diagnosis' },
        treatment: {
          immediate: [], ongoing: [], lifestyle: [],
          followUp: { timeline: '', specialty: [], tests: [], education: [] },
          prognosis: '', complications: [],
          discharge: { criteria: [], instructions: [], medications: [], followUpInstructions: '' }
        },
        metadata: { author: instructor._id, status: 'published', estimatedDuration: 30 }
      });

      await Case.create({
        title: 'Draft Case',
        description: 'A draft test case',
        specialty: 'Surgery',
        bodySystem: ['Musculoskeletal'],
        difficulty: 'advanced',
        estimatedDuration: 60,
        patient: { name: 'Test Patient 2', age: 35, gender: 'female' },
        presentation: { 
          chiefComplaint: 'Abdominal pain',
          historyOfPresentIllness: 'Patient presents with abdominal pain'
        },
        simulationSteps: [],
        diagnostics: { finalDiagnosis: 'Test Diagnosis 2' },
        treatment: {
          immediate: [], ongoing: [], lifestyle: [],
          followUp: { timeline: '', specialty: [], tests: [], education: [] },
          prognosis: '', complications: [],
          discharge: { criteria: [], instructions: [], medications: [], followUpInstructions: '' }
        },
        metadata: { author: instructor._id, status: 'draft', estimatedDuration: 60 }
      });
    });

    it('should return only published cases for unauthenticated users', async () => {
      const response = await request(app)
        .get('/api/cases')
        .expect(200);

      expect(response.body.cases).toHaveLength(1);
      expect(response.body.cases[0].title).toBe('Published Case');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/cases?page=1&limit=1')
        .expect(200);

      expect(response.body.cases).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalCount).toBe(1);
    });

    it('should support filtering by specialty', async () => {
      const response = await request(app)
        .get('/api/cases?specialty=Internal Medicine')
        .expect(200);

      expect(response.body.cases).toHaveLength(1);
      expect(response.body.cases[0].specialty).toBe('Internal Medicine');
    });

    it('should support filtering by difficulty', async () => {
      const response = await request(app)
        .get('/api/cases?difficulty=beginner')
        .expect(200);

      expect(response.body.cases).toHaveLength(1);
      expect(response.body.cases[0].difficulty).toBe('beginner');
    });
  });

  describe('POST /api/cases', () => {
    const validCaseData = {
      title: 'New Test Case',
      description: 'A new test case',
      specialty: 'Emergency Medicine',
      bodySystem: ['Cardiovascular'],
      difficulty: 'intermediate',
      tags: ['cardiology'],
      patient: {
        name: 'John Doe',
        age: 55,
        gender: 'male',
        medicalHistory: ['Hypertension']
      },
      presentation: {
        chiefComplaint: 'Chest pain',
        historyOfPresentIllness: 'Sudden onset chest pain'
      },
      simulationSteps: [{
        stepId: 'step1',
        title: 'Assessment',
        description: 'Initial assessment',
        question: 'What is your concern?',
        options: [
          { optionId: 'a', text: 'MI', isCorrect: true },
          { optionId: 'b', text: 'PE', isCorrect: false }
        ],
        correctAnswer: 'a',
        score: 10
      }],
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
        estimatedDuration: 45
      }
    };

    it('should allow instructors to create cases', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(validCaseData)
        .expect(201);

      expect(response.body.message).toBe('Case created successfully');
      expect(response.body.case.title).toBe(validCaseData.title);
      expect(response.body.case.metadata.status).toBe('draft');
    });

    it('should allow admins to create cases', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCaseData)
        .expect(201);

      expect(response.body.message).toBe('Case created successfully');
    });

    it('should reject students from creating cases', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validCaseData)
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject invalid case data', async () => {
      const invalidData = { ...validCaseData };
      delete invalidData.title;

      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/cases/:id', () => {
    let publishedCase, draftCase;

    beforeEach(async () => {
      publishedCase = await Case.create({
        title: 'Published Case',
        description: 'A published test case',
        specialty: 'Internal Medicine',
        bodySystem: ['Cardiovascular'],
        difficulty: 'beginner',
        estimatedDuration: 30,
        patient: { name: 'Test Patient', age: 45, gender: 'male' },
        presentation: { 
          chiefComplaint: 'Chest pain',
          historyOfPresentIllness: 'Patient presents with chest pain'
        },
        simulationSteps: [],
        diagnostics: { finalDiagnosis: 'Test Diagnosis' },
        treatment: {
          immediate: [], ongoing: [], lifestyle: [],
          followUp: { timeline: '', specialty: [], tests: [], education: [] },
          prognosis: '', complications: [],
          discharge: { criteria: [], instructions: [], medications: [], followUpInstructions: '' }
        },
        metadata: { author: instructor._id, status: 'published', estimatedDuration: 30 }
      });

      draftCase = await Case.create({
        title: 'Draft Case',
        description: 'A draft test case',
        specialty: 'Surgery',
        bodySystem: ['Musculoskeletal'],
        difficulty: 'advanced',
        estimatedDuration: 60,
        patient: { name: 'Test Patient 2', age: 35, gender: 'female' },
        presentation: { 
          chiefComplaint: 'Abdominal pain',
          historyOfPresentIllness: 'Patient presents with abdominal pain'
        },
        simulationSteps: [],
        diagnostics: { finalDiagnosis: 'Test Diagnosis 2' },
        treatment: {
          immediate: [], ongoing: [], lifestyle: [],
          followUp: { timeline: '', specialty: [], tests: [], education: [] },
          prognosis: '', complications: [],
          discharge: { criteria: [], instructions: [], medications: [], followUpInstructions: '' }
        },
        metadata: { author: instructor._id, status: 'draft', estimatedDuration: 60 }
      });
    });

    it('should return published case for authenticated users', async () => {
      const response = await request(app)
        .get(`/api/cases/${publishedCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.title).toBe('Published Case');
    });

    it('should allow author to access draft case', async () => {
      const response = await request(app)
        .get(`/api/cases/${draftCase._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body.title).toBe('Draft Case');
    });

    it('should deny non-author access to draft case', async () => {
      const response = await request(app)
        .get(`/api/cases/${draftCase._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.code).toBe('CASE_ACCESS_DENIED');
    });

    it('should return 404 for non-existent case', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/cases/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body.code).toBe('CASE_NOT_FOUND');
    });
  });
});