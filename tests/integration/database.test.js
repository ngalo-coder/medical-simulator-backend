const mongoose = require('mongoose');
const { User, Case, Progress } = require('../../models');

describe('Database Integration', () => {
  describe('User Model', () => {
    it('should create and save a user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123',
        profile: {
          firstName: 'Test',
          lastName: 'User',
          institution: 'Test University'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.profile.firstName).toBe(userData.profile.firstName);
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPass123',
        profile: {
          firstName: 'Test',
          lastName: 'User'
        }
      };

      // Create first user
      const user1 = new User(userData);
      await user1.save();

      // Try to create second user with same email
      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'password@example.com',
        password: 'PlainPassword123',
        profile: {
          firstName: 'Test',
          lastName: 'User'
        }
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe('PlainPassword123');
      expect(user.password.length).toBeGreaterThan(50); // Hashed password is longer
    });

    it('should compare passwords correctly', async () => {
      const userData = {
        email: 'compare@example.com',
        password: 'TestPassword123',
        profile: {
          firstName: 'Test',
          lastName: 'User'
        }
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('TestPassword123');
      const isNotMatch = await user.comparePassword('WrongPassword');

      expect(isMatch).toBe(true);
      expect(isNotMatch).toBe(false);
    });
  });

  describe('Case Model', () => {
    let instructor;

    beforeEach(async () => {
      instructor = await global.testUtils.createTestUser({
        role: 'instructor',
        email: 'instructor@example.com'
      });
    });

    it('should create and save a case successfully', async () => {
      const caseData = {
        title: 'Test Case',
        description: 'A test case for database testing',
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
        simulationSteps: [{
          stepId: 'step1',
          title: 'Assessment',
          description: 'Initial assessment',
          question: 'What is your concern?',
          options: [
            { optionId: 'a', text: 'Option A', isCorrect: true },
            { optionId: 'b', text: 'Option B', isCorrect: false }
          ],
          correctAnswer: 'a',
          score: 10
        }],
        diagnostics: {
          finalDiagnosis: 'Test Diagnosis'
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
          status: 'draft',
          estimatedDuration: 30
        }
      };

      const testCase = new Case(caseData);
      const savedCase = await testCase.save();

      expect(savedCase._id).toBeDefined();
      expect(savedCase.title).toBe(caseData.title);
      expect(savedCase.metadata.author.toString()).toBe(instructor._id.toString());
    });

    it('should increment view count', async () => {
      const testCase = new Case({
        title: 'View Count Test',
        description: 'Testing view count functionality',
        specialty: 'Emergency Medicine',
        bodySystem: ['Cardiovascular'],
        difficulty: 'beginner',
        estimatedDuration: 20,
        patient: { name: 'Test Patient', age: 30, gender: 'female' },
        presentation: { 
          chiefComplaint: 'Test complaint',
          historyOfPresentIllness: 'Test history'
        },
        simulationSteps: [],
        diagnostics: { finalDiagnosis: 'Test' },
        treatment: {
          immediate: [], ongoing: [], lifestyle: [],
          followUp: { timeline: '', specialty: [], tests: [], education: [] },
          prognosis: '', complications: [],
          discharge: { criteria: [], instructions: [], medications: [], followUpInstructions: '' }
        },
        metadata: {
          author: instructor._id,
          status: 'published',
          estimatedDuration: 20
        }
      });

      await testCase.save();
      expect(testCase.metadata.viewCount).toBe(0);

      await testCase.incrementViewCount();
      expect(testCase.metadata.viewCount).toBe(1);

      await testCase.incrementViewCount();
      expect(testCase.metadata.viewCount).toBe(2);
    });
  });

  describe('Progress Model', () => {
    let student, testCase;

    beforeEach(async () => {
      student = await global.testUtils.createTestUser({
        role: 'student',
        email: 'student@example.com'
      });

      const instructor = await global.testUtils.createTestUser({
        role: 'instructor',
        email: 'instructor2@example.com'
      });

      testCase = new Case({
        title: 'Progress Test Case',
        description: 'Case for testing progress',
        specialty: 'Internal Medicine',
        bodySystem: ['Cardiovascular'],
        difficulty: 'intermediate',
        estimatedDuration: 30,
        patient: { name: 'Test Patient', age: 40, gender: 'male' },
        presentation: { 
          chiefComplaint: 'Test complaint',
          historyOfPresentIllness: 'Test history'
        },
        simulationSteps: [
          { stepId: 'step1', title: 'Step 1', description: 'First step', question: 'Question 1', options: [], correctAnswer: 'a', score: 10 },
          { stepId: 'step2', title: 'Step 2', description: 'Second step', question: 'Question 2', options: [], correctAnswer: 'b', score: 10 }
        ],
        diagnostics: { finalDiagnosis: 'Test Diagnosis' },
        treatment: {
          immediate: [], ongoing: [], lifestyle: [],
          followUp: { timeline: '', specialty: [], tests: [], education: [] },
          prognosis: '', complications: [],
          discharge: { criteria: [], instructions: [], medications: [], followUpInstructions: '' }
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

    it('should create and save progress successfully', async () => {
      const progressData = {
        userId: student._id,
        caseId: testCase._id,
        sessionId: 'test-session-123',
        maxPossibleScore: 20,
        totalSteps: 2,
        status: 'started'
      };

      const progress = new Progress(progressData);
      const savedProgress = await progress.save();

      expect(savedProgress._id).toBeDefined();
      expect(savedProgress.userId.toString()).toBe(student._id.toString());
      expect(savedProgress.caseId.toString()).toBe(testCase._id.toString());
      expect(savedProgress.sessionId).toBe('test-session-123');
    });

    it('should calculate completion percentage correctly', async () => {
      const progress = new Progress({
        userId: student._id,
        caseId: testCase._id,
        sessionId: 'completion-test',
        maxPossibleScore: 20,
        totalSteps: 4,
        stepsCompleted: 2,
        status: 'started'
      });

      expect(progress.completionPercentage).toBe(50);

      progress.stepsCompleted = 4;
      expect(progress.completionPercentage).toBe(100);

      progress.stepsCompleted = 0;
      expect(progress.completionPercentage).toBe(0);
    });
  });

  describe('Database Indexes', () => {
    it('should have proper indexes on User collection', async () => {
      const indexes = await mongoose.connection.collection('users').indexes();
      const indexNames = indexes.map(index => Object.keys(index.key).join('_'));
      
      expect(indexNames).toContain('email');
    });

    it('should have proper indexes on Case collection', async () => {
      const indexes = await mongoose.connection.collection('cases').indexes();
      const indexNames = indexes.map(index => Object.keys(index.key).join('_'));
      
      expect(indexNames.some(name => name.includes('specialty'))).toBe(true);
      expect(indexNames.some(name => name.includes('difficulty'))).toBe(true);
    });
  });
});