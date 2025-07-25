const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
require('dotenv').config({ path: '.env.test' });

let mongoServer;

beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Override MongoDB URI for tests
  process.env.MONGODB_URI = mongoUri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
  
  // Connect to test database
  await connectDB();
});

afterAll(async () => {
  // Clean up
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Global test utilities
global.testUtils = {
  createTestUser: async (userData = {}) => {
    const User = require('../models/User');
    const defaultUser = {
      email: 'test@example.com',
      password: 'TestPass123',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        institution: 'Test University'
      },
      role: 'student',
      ...userData
    };
    
    const user = new User(defaultUser);
    await user.save();
    return user;
  },
  
  createTestCase: async (caseData = {}) => {
    const Case = require('../models/Case');
    const User = require('../models/User');
    
    // Create author if not provided
    let author = caseData.author;
    if (!author) {
      author = await global.testUtils.createTestUser({
        role: 'instructor',
        email: 'instructor@example.com'
      });
    }
    
    const defaultCase = {
      title: 'Test Case',
      description: 'A test medical case',
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
        question: 'What is your diagnosis?',
        options: [{
          optionId: 'a',
          text: 'Option A',
          explanation: 'Correct answer',
          isCorrect: true
        }],
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
        author: author._id,
        status: 'published',
        estimatedDuration: 30
      },
      ...caseData
    };
    
    const testCase = new Case(defaultCase);
    await testCase.save();
    return testCase;
  },
  
  generateAuthToken: (user) => {
    const { generateToken } = require('../utils/auth');
    return generateToken(user);
  }
};

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}