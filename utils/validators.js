// ==================== utils/validators.js ====================
const Joi = require('joi');

const validators = {
  // Email validation
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),

  // Password validation
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),

  // MongoDB ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'Invalid ID format'
  }),

  // User profile validation
  userProfile: Joi.object({
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().min(1).max(50).required(),
    institution: Joi.string().trim().max(100).allow(''),
    specialty: Joi.string().trim().max(50).allow(''),
    yearOfStudy: Joi.number().integer().min(1).max(10),
    medicalLicense: Joi.string().trim().max(50).allow('')
  }),

  // User registration
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
    profile: Joi.object({
      firstName: Joi.string().trim().min(1).max(50).required(),
      lastName: Joi.string().trim().min(1).max(50).required(),
      institution: Joi.string().trim().max(100),
      specialty: Joi.string().trim().max(50),
      yearOfStudy: Joi.number().integer().min(1).max(10)
    }).required(),
    role: Joi.string().valid('student', 'resident', 'attending', 'instructor').default('student')
  }),

  // Case validation schemas
  caseTitle: Joi.string().trim().min(5).max(200).required(),
  caseDescription: Joi.string().trim().min(10).max(1000).required(),
  specialty: Joi.string().valid(
    'Internal Medicine', 'Surgery', 'Pediatrics', 'Obstetrics & Gynecology',
    'Emergency Medicine', 'Cardiology', 'Neurology', 'Psychiatry',
    'Radiology', 'Pathology', 'Anesthesiology', 'Family Medicine',
    'Dermatology', 'Ophthalmology', 'Orthopedics', 'Urology',
    'Gastroenterology', 'Pulmonology', 'Endocrinology', 'Rheumatology'
  ).required(),
  
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),

  // Patient validation
  patient: Joi.object({
    age: Joi.number().integer().min(0).max(120).required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    ethnicity: Joi.string().allow(''),
    occupation: Joi.string().allow(''),
    medicalHistory: Joi.array().items(Joi.string()),
    medications: Joi.array().items(Joi.string()),
    allergies: Joi.array().items(Joi.string()),
    socialHistory: Joi.object({
      smoking: Joi.string().allow(''),
      alcohol: Joi.string().allow(''),
      drugs: Joi.string().allow(''),
      family: Joi.string().allow('')
    })
  }),

  // Simulation step validation
  simulationStep: Joi.object({
    stepId: Joi.string().required(),
    type: Joi.string().valid('question', 'decision', 'assessment', 'intervention', 'diagnosis').required(),
    title: Joi.string().allow(''),
    content: Joi.string().required(),
    options: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      text: Joi.string().required(),
      isCorrect: Joi.boolean().required(),
      feedback: Joi.string().required(),
      points: Joi.number().min(0).default(0)
    })).min(1).required(),
    timeLimit: Joi.number().min(0),
    dependencies: Joi.array().items(Joi.string()),
    clinicalReasoning: Joi.object({
      learningObjectives: Joi.array().items(Joi.string()),
      keyPoints: Joi.array().items(Joi.string()),
      commonMistakes: Joi.array().items(Joi.string()),
      references: Joi.array().items(Joi.string())
    })
  }),

  // Query parameters validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  // Sort validation
  sort: Joi.object({
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Search validation
  search: Joi.string().trim().max(100),

  // File validation
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().valid(
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ).required(),
    size: Joi.number().max(10 * 1024 * 1024) // 10MB
  }),

  // Discussion post validation
  discussionPost: Joi.object({
    content: Joi.string().trim().min(1).max(2000).required(),
    type: Joi.string().valid('question', 'comment', 'clarification', 'answer').default('comment'),
    parentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null)
  }),

  // User feedback validation
  userFeedback: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    difficulty: Joi.string().valid('too_easy', 'just_right', 'too_hard'),
    comments: Joi.string().max(1000).allow(''),
    wouldRecommend: Joi.boolean()
  }),

  // Achievement validation
  achievement: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    icon: Joi.string().required(),
    category: Joi.string().default('general')
  }),

  // Analytics filter validation
  analyticsFilter: Joi.object({
    timeframe: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
    specialty: Joi.string(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    institution: Joi.string()
  }),

  // Case creation validation
  caseCreation: Joi.object({
    title: Joi.string().trim().min(5).max(200).required(),
    description: Joi.string().trim().min(10).max(1000).required(),
    specialty: Joi.string().required(),
    bodySystem: Joi.array().items(Joi.string()),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    tags: Joi.array().items(Joi.string()),
    patient: Joi.object({
      age: Joi.number().integer().min(0).max(120).required(),
      gender: Joi.string().valid('male', 'female', 'other').required(),
      ethnicity: Joi.string().allow(''),
      occupation: Joi.string().allow(''),
      medicalHistory: Joi.array().items(Joi.string()),
      medications: Joi.array().items(Joi.string()),
      allergies: Joi.array().items(Joi.string())
    }).required(),
    presentation: Joi.object({
      chiefComplaint: Joi.string().required(),
      historyOfPresentIllness: Joi.string().required()
    }).required(),
    simulationSteps: Joi.array().items(Joi.object()),
    diagnostics: Joi.object({
      finalDiagnosis: Joi.string().required()
    }).required(),
    treatment: Joi.object().required(),
    metadata: Joi.object({
      estimatedDuration: Joi.number().integer().min(5).max(240).required()
    })
  }),

  // Login validation
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Password reset validation
  passwordReset: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
  }),

  // Review validation
  caseReview: Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'needs_revision').required(),
    comments: Joi.string().max(1000),
    criteria: Joi.object({
      clinicalAccuracy: Joi.object({
        score: Joi.number().min(1).max(5).required(),
        comments: Joi.string().allow('')
      }),
      educationalValue: Joi.object({
        score: Joi.number().min(1).max(5).required(),
        comments: Joi.string().allow('')
      }),
      clarity: Joi.object({
        score: Joi.number().min(1).max(5).required(),
        comments: Joi.string().allow('')
      })
    })
  })
};

// Validation middleware factory
const createValidator = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = { validators, createValidator };