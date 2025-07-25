const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
  date: { type: Date, default: Date.now },
  eventType: { type: String, required: true }, // e.g., 'case_started', 'case_completed', 'step_answered'
  metadata: Object // Additional event-specific data
});

module.exports = mongoose.model('Analytics', analyticsSchema);