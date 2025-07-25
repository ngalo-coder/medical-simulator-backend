const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // User indexes
    await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.collection('users').createIndex({ 'profile.firstName': 'text', 'profile.lastName': 'text' });
    await mongoose.connection.collection('users').createIndex({ 'profile.institution': 1 });

    // Case indexes
    await mongoose.connection.collection('cases').createIndex({ specialty: 1 });
    await mongoose.connection.collection('cases').createIndex({ difficulty: 1 });
    await mongoose.connection.collection('cases').createIndex({ bodySystem: 1 });
    await mongoose.connection.collection('cases').createIndex({ tags: 1 });
    await mongoose.connection.collection('cases').createIndex({ 'metadata.status': 1 });
    await mongoose.connection.collection('cases').createIndex({ 'metadata.author': 1 });
    await mongoose.connection.collection('cases').createIndex({ createdAt: -1 });
    await mongoose.connection.collection('cases').createIndex({
      title: 'text',
      description: 'text',
      'presentation.chiefComplaint': 'text'
    });

    // Progress indexes
    await mongoose.connection.collection('progresses').createIndex({ userId: 1, caseId: 1 });
    await mongoose.connection.collection('progresses').createIndex({ sessionId: 1 });
    await mongoose.connection.collection('progresses').createIndex({ status: 1 });

    // Review indexes
    await mongoose.connection.collection('reviews').createIndex({ caseId: 1 });
    await mongoose.connection.collection('reviews').createIndex({ userId: 1 });
    await mongoose.connection.collection('reviews').createIndex({ createdAt: -1 });

    // Discussion indexes
    await mongoose.connection.collection('discussions').createIndex({ caseId: 1 });
    await mongoose.connection.collection('discussions').createIndex({ parentId: 1 });
    await mongoose.connection.collection('discussions').createIndex({ author: 1 });
    await mongoose.connection.collection('discussions').createIndex({ createdAt: -1 });
    await mongoose.connection.collection('discussions').createIndex({ tags: 1 });
    await mongoose.connection.collection('discussions').createIndex({ isPinned: -1, createdAt: -1 });
    await mongoose.connection.collection('discussions').createIndex({ content: 'text', title: 'text' });

    // Analytics indexes
    await mongoose.connection.collection('analytics').createIndex({ userId: 1 });
    await mongoose.connection.collection('analytics').createIndex({ caseId: 1 });
    await mongoose.connection.collection('analytics').createIndex({ date: 1 });

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };