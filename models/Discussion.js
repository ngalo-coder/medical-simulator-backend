const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion' }, // For replies
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true },
  tags: [String],
  isPinned: { type: Boolean, default: false },

  // Voting
  votes: {
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },

  // Moderation
  isLocked: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  editHistory: [{
    content: String,
    editedAt: { type: Date, default: Date.now },
    reason: String
  }],

  // Attachments
  attachments: [{
    type: { type: String, enum: ['image', 'document', 'link'] },
    url: String,
    name: String,
    size: Number
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for vote score
discussionSchema.virtual('voteScore').get(function() {
  return this.votes.upvotes.length - this.votes.downvotes.length;
});

// Virtual for reply count
discussionSchema.virtual('replyCount', {
  ref: 'Discussion',
  localField: '_id',
  foreignField: 'parentId',
  count: true
});

module.exports = mongoose.model('Discussion', discussionSchema);