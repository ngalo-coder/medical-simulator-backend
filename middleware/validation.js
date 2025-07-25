const Joi = require('joi');
const logger = require('../utils/logger');

// Validation schemas
const schemas = {
  // User registration
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
    profile: Joi.object({
      firstName: Joi.string().trim().min(1).max(50).required(),
      lastName: Joi.string().trim().min(1).max(50).required(),
      institution: Joi.string().trim().max(100),
      specialty: Joi.string().trim().max(50),
      yearOfStudy: Joi.number().integer().min(1).max(10)
    }).required(),
  }),

  // User login
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Case creation/update
  case: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(1000).required(),
    specialty: Joi.string().required(),
    bodySystem: Joi.array().items(Joi.string()).required(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    tags: Joi.array().items(Joi.string()),
    patient: Joi.object({
      name: Joi.string().required(),
      age: Joi.number().integer().min(0).max(120).required(),
      gender: Joi.string().valid('male', 'female', 'other').required(),
      ethnicity: Joi.string(),
      occupation: Joi.string(),
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

  // Query parameters
  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().trim().max(100),
    specialty: Joi.string(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    bodySystem: Joi.string(),
    tags: Joi.string()
  }),

  // Discussion post
  discussionPost: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    content: Joi.string().trim().min(1).required(),
    tags: Joi.array().items(Joi.string()),
    isPinned: Joi.boolean().default(false)
  }),

  // Reply to discussion
  discussionReply: Joi.object({
    content: Joi.string().trim().min(1).required()
  })
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      logger.error(`Validation schema not found: ${schemaName}`);
      return res.status(500).json({ error: 'Validation configuration error' });
    }

    const { error, value } = schema.validate(req.body);
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      logger.error('Validation failed:', {
        schemaName,
        requestBody: req.body,
        validationErrors: details
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: details.map(d => d.message),
        fields: details
      });
    }

    req.validatedData = value;
    next();
  };
};

module.exports = { validate, schemas };