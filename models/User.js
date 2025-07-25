const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, ACHIEVEMENTS } = require('../utils/constants');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  profile: {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    institution: { type: String, trim: true, maxlength: 100 },
    specialty: { type: String, trim: true, maxlength: 50 },
    yearOfStudy: { type: Number, min: 1, max: 10 },
    avatar: { type: String } // URL to avatar image
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.STUDENT
  },
  permissions: [{
    resource: String,
    actions: [String] // e.g., ['read', 'write', 'delete']
  }],
  statistics: {
    casesCompleted: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 }, // in seconds
    streakDays: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: Date.now },
    loginCount: { type: Number, default: 0 }
  },
  achievements: [{
    name: String,
    description: String,
    earnedDate: { type: Date, default: Date.now },
    icon: String,
    category: String
  }],
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    deviceInfo: String
  }],
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  preferences: {
    theme: { type: String, default: 'light' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    privacy: {
      profileVisibility: { type: String, default: 'public' },
      activityVisibility: { type: String, default: 'friends' }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check achievement eligibility
userSchema.methods.checkAchievements = function() {
  const newAchievements = [];
  const currentStats = this.statistics;

  ACHIEVEMENTS.forEach(achievement => {
    if (!this.achievements.some(a => a.name === achievement.name) &&
        achievement.condition(currentStats)) {
      newAchievements.push({
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: 'general'
      });
    }
  });

  return newAchievements;
};

module.exports = mongoose.model('User', userSchema);