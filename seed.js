const mongoose = require('mongoose');
const User = require('./models/User');
const Case = require('./models/Case');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Case.deleteMany({});

    // Create sample users
    const users = [
      {
        email: 'admin@example.com',
        password: 'AdminPass123',
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          institution: 'Medical University'
        },
        role: 'admin'
      },
      {
        email: 'instructor@example.com',
        password: 'InstructorPass123',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          institution: 'Teaching Hospital',
          specialty: 'Internal Medicine'
        },
        role: 'instructor'
      },
      {
        email: 'student@example.com',
        password: 'StudentPass123',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          institution: 'Medical School',
          yearOfStudy: 3
        },
        role: 'student'
      }
    ];

    const createdUsers = await User.insertMany(users);
    logger.info(`Created ${createdUsers.length} users`);

    // Create sample cases
    const cases = [
      {
        title: 'Acute Chest Pain',
        description: 'A 55-year-old male presents with sudden onset chest pain.',
        specialty: 'Emergency Medicine',
        bodySystem: ['Cardiovascular'],
        difficulty: 'intermediate',
        tags: ['cardiology', 'emergency'],
        estimatedDuration: 30,
        patient: {
          name: 'John Doe',
          age: 55,
          gender: 'male',
          medicalHistory: ['Hypertension', 'Hyperlipidemia']
        },
        presentation: {
          chiefComplaint: 'Chest pain',
          historyOfPresentIllness: 'Sudden onset substernal chest pain radiating to left arm...'
        },
        simulationSteps: [
          {
            stepId: 'step1',
            title: 'Initial Assessment',
            description: 'Assess the patient\'s vital signs and symptoms.',
            question: 'What is your primary concern?',
            options: [
              { optionId: 'a', text: 'Myocardial infarction', explanation: 'Correct, given the symptoms.', isCorrect: true },
              { optionId: 'b', text: 'Pulmonary embolism', explanation: 'Possible, but less likely.', isCorrect: false },
              { optionId: 'c', text: 'Gastroesophageal reflux', explanation: 'Unlikely given radiation to arm.', isCorrect: false }
            ],
            correctAnswer: 'a',
            score: 10
          }
        ],
        diagnostics: {
          finalDiagnosis: 'Acute Myocardial Infarction',
          differentialDiagnosis: [
            { diagnosis: 'Myocardial Infarction', probability: 80 },
            { diagnosis: 'Pulmonary Embolism', probability: 10 },
            { diagnosis: 'Aortic Dissection', probability: 5 }
          ]
        },
        treatment: {
          immediate: [
            { intervention: 'Aspirin 325mg', dosage: '325mg', route: 'oral', frequency: 'once', duration: 'once', rationale: 'Antiplatelet therapy' }
          ],
          ongoing: [],
          lifestyle: ['Smoking cessation counseling'],
          followUp: {
            timeline: '1 week',
            specialty: ['Cardiology'],
            tests: ['Stress test'],
            education: ['Heart-healthy diet']
          },
          prognosis: 'Good with timely intervention',
          complications: [],
          discharge: {
            criteria: ['Stable vital signs', 'Pain controlled'],
            instructions: ['Take medications as prescribed'],
            medications: ['Aspirin', 'Beta-blocker'],
            followUpInstructions: 'See cardiologist in 1 week'
          }
        },
        metadata: {
          author: createdUsers[1]._id, // instructor
          status: 'published',
          estimatedDuration: 30
        }
      }
    ];

    const createdCases = await Case.insertMany(cases);
    logger.info(`Created ${createdCases.length} cases`);

    console.log('✅ Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;