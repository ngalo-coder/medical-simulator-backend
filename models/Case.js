const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  specialty: { type: String, required: true },
  bodySystem: [{ type: String, required: true }],
  difficulty: { type: String, required: true, enum: ['beginner', 'intermediate', 'advanced'] },
  tags: [String],
  estimatedDuration: { type: Number, required: true }, // minutes
  maxScore: { type: Number, default: 100 },

  // Patient Information
  patient: {
    name: { type: String, required: true },
    age: { type: Number, min: 0, max: 120, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    ethnicity: String,
    occupation: String,
    medicalHistory: [String],
    medications: [String],
    allergies: [String]
  },

  // Clinical Presentation
  presentation: {
    chiefComplaint: { type: String, required: true },
    historyOfPresentIllness: { type: String, required: true }
  },

  // Simulation Steps
  simulationSteps: [{
    stepId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    question: { type: String, required: true },
    options: [{
      optionId: { type: String, required: true },
      text: { type: String, required: true },
      explanation: String,
      isCorrect: { type: Boolean, required: true }
    }],
    correctAnswer: { type: String, required: true },
    score: { type: Number, default: 1 },
    timeLimit: Number, // seconds
    dependencies: [String], // stepIds that must be completed first
    hints: [String],
    media: [{
      type: { type: String, enum: ['image', 'video', 'audio', 'document', 'animation'] },
      url: String,
      caption: String,
      description: String
    }],
    clinicalReasoning: {
      learningObjectives: [String],
      keyPoints: [String],
      commonMistakes: [String],
      references: [String],
      expertTips: [String]
    }
  }],

  // Diagnostic Information
  diagnostics: {
    differentialDiagnosis: [{
      diagnosis: { type: String, required: true },
      probability: { type: Number, min: 0, max: 100 },
      reasoning: String
    }],
    finalDiagnosis: { type: String, required: true },
    icdCode: String,
    diagnosticTests: [{
      name: { type: String, required: true },
      type: { type: String, enum: ['lab', 'imaging', 'procedure', 'biopsy', 'other'] },
      results: String,
      interpretation: String,
      cost: Number,
      availability: String,
      urgency: { type: String, enum: ['stat', 'urgent', 'routine'] }
    }],
    imaging: [{
      type: { type: String, enum: ['xray', 'ct', 'mri', 'ultrasound', 'pet', 'nuclear', 'other'] },
      bodyPart: String,
      findings: String,
      images: [String], // URLs to image files
      radiologistReport: String
    }],
    labResults: {
      cbc: Object,
      bmp: Object,
      lft: Object,
      cardiac: Object,
      coagulation: Object,
      urinalysis: Object,
      other: Object
    }
  },

  // Treatment and Management
  treatment: {
    immediate: [{
      intervention: String,
      dosage: String,
      route: String,
      frequency: String,
      duration: String,
      rationale: String
    }],
    ongoing: [{
      intervention: String,
      dosage: String,
      duration: String,
      monitoring: String
    }],
    lifestyle: [String],
    followUp: {
      timeline: String,
      specialty: [String],
      tests: [String],
      education: [String]
    },
    prognosis: String,
    complications: [{
      complication: String,
      probability: String,
      management: String
    }],
    discharge: {
      criteria: [String],
      instructions: [String],
      medications: [String],
      followUpInstructions: String
    }
  },

  // Educational Metadata
  metadata: {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['draft', 'review', 'approved', 'published', 'archived'], default: 'draft' },
    version: { type: Number, default: 1 },
    estimatedDuration: { type: Number, required: true }, // minutes
    maxScore: { type: Number, default: 100 },

    // Analytics
    completionRate: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    lastReviewed: Date,
    reviewCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total steps
caseSchema.virtual('totalSteps').get(function() {
  return this.simulationSteps.length;
});

// Method to increment view count
caseSchema.methods.incrementViewCount = async function() {
  this.metadata.viewCount += 1;
  await this.save();
};

module.exports = mongoose.model('Case', caseSchema);