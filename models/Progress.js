const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  sessionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['started', 'paused', 'completed', 'abandoned', 'expired'], default: 'started' },

  // Performance Metrics
  score: { type: Number, default: 0, min: 0 },
  maxPossibleScore: { type: Number, required: true },
  percentageScore: { type: Number, default: 0, min: 0, max: 100 },
  timeSpent: { type: Number, default: 0 }, // seconds
  stepsCompleted: { type: Number, default: 0 },
  totalSteps: { type: Number, required: true },

  // Detailed Step Performance
  stepPerformance: [{
    stepId: { type: String, required: true },
    selectedOption: String,
    isCorrect: { type: Boolean, required: true },
    timeSpent: { type: Number, default: 0 }, // seconds
    hintsUsed: { type: Number, default: 0 },
    score: { type: Number, default: 0 }
  }],

  // Session Details
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  pauseHistory: [{
    pausedAt: Date,
    resumedAt: Date
  }],
  ipAddress: String,

  // Review and Feedback
  userFeedback: {
    rating: { type: Number, min: 1, max: 5 },
    difficulty: { type: String, enum: ['too_easy', 'just_right', 'too_hard'] },
    comments: String,
    wouldRecommend: Boolean
  },

  // Instructor Review (if applicable)
  instructorReview: {
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, min: 0, max: 100 },
    feedback: String,
    reviewDate: Date,
    recommendations: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
progressSchema.virtual('completionPercentage').get(function() {
  return this.totalSteps > 0 ? Math.round((this.stepsCompleted / this.totalSteps) * 100) : 0;
});

module.exports = mongoose.model('Progress', progressSchema);