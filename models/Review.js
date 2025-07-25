const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Progress' },

  // Review Criteria with scores and comments
  criteria: {
    clinicalAccuracy: {
      score: { type: Number, min: 1, max: 5 },
      comments: String,
      weight: { type: Number, default: 0.3 }
    },
    educationalValue: {
      score: { type: Number, min: 1, max: 5 },
      comments: String,
      weight: { type: Number, default: 0.25 }
    },
    clarity: {
      score: { type: Number, min: 1, max: 5 },
      comments: String,
      weight: { type: Number, default: 0.2 }
    },
    difficulty: {
      score: { type: Number, min: 1, max: 5 },
      comments: String,
      weight: { type: Number, default: 0.15 }
    },
    engagement: {
      score: { type: Number, min: 1, max: 5 },
      comments: String,
      weight: { type: Number, default: 0.1 }
    }
  },
  overallScore: { type: Number, min: 1, max: 5 },
  overallComments: String,

  // Specific feedback sections
  strengths: [String],
  improvements: [String],
  suggestions: [String],

  // Review metadata
  timeSpent: { type: Number, default: 0 }, // minutes
  isPublic: { type: Boolean, default: false },

  // Follow-up
  followUpRequired: { type: Boolean, default: false },
  followUpDate: Date,
  followUpComments: String
}, {
  timestamps: true
});

// Pre-save middleware to calculate overall score
reviewSchema.pre('save', function(next) {
  if (this.criteria) {
    let totalScore = 0;
    let totalWeight = 0;
    for (const [key, value] of Object.entries(this.criteria)) {
      if (value.score && value.weight) {
        totalScore += value.score * value.weight;
        totalWeight += value.weight;
      }
    }
    this.overallScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0;
  }
  next();
});

module.exports = mongoose.model('Review', reviewSchema);