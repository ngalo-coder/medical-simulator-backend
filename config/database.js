const mongoose = require('mongoose');
const logger = require('../utils/logger');

const createIndexSafely = async (collection, indexSpec, options = {}) => {
  try {
    await collection.createIndex(indexSpec, options);
  } catch (error) {
    if (error.code === 86) { // IndexKeySpecsConflict
      logger.info(`Index already exists with different specifications, skipping: ${JSON.stringify(indexSpec)}`);
    } else {
      throw error;
    }
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // User indexes
    await createIndexSafely(mongoose.connection.collection('users'), { email: 1 }, { unique: true });
    await createIndexSafely(mongoose.connection.collection('users'), { 'profile.firstName': 'text', 'profile.lastName': 'text' });
    await createIndexSafely(mongoose.connection.collection('users'), { 'profile.institution': 1 });

    // Case indexes
    await createIndexSafely(mongoose.connection.collection('cases'), { specialty: 1 });
    await createIndexSafely(mongoose.connection.collection('cases'), { difficulty: 1 });
    await createIndexSafely(mongoose.connection.collection('cases'), { bodySystem: 1 });
    await createIndexSafely(mongoose.connection.collection('cases'), { tags: 1 });
    await createIndexSafely(mongoose.connection.collection('cases'), { 'metadata.status': 1 });
    await createIndexSafely(mongoose.connection.collection('cases'), { 'metadata.author': 1 });
    await createIndexSafely(mongoose.connection.collection('cases'), { createdAt: -1 });
    await createIndexSafely(mongoose.connection.collection('cases'), {
      title: 'text',
      description: 'text',
      'presentation.chiefComplaint': 'text'
    });

    // Progress indexes
    await createIndexSafely(mongoose.connection.collection('progresses'), { userId: 1, caseId: 1 });
    await createIndexSafely(mongoose.connection.collection('progresses'), { sessionId: 1 });
    await createIndexSafely(mongoose.connection.collection('progresses'), { status: 1 });

    // Review indexes
    await createIndexSafely(mongoose.connection.collection('reviews'), { caseId: 1 });
    await createIndexSafely(mongoose.connection.collection('reviews'), { userId: 1 });
    await createIndexSafely(mongoose.connection.collection('reviews'), { createdAt: -1 });

    // Discussion indexes
    await createIndexSafely(mongoose.connection.collection('discussions'), { caseId: 1 });
    await createIndexSafely(mongoose.connection.collection('discussions'), { parentId: 1 });
    await createIndexSafely(mongoose.connection.collection('discussions'), { author: 1 });
    await createIndexSafely(mongoose.connection.collection('discussions'), { createdAt: -1 });
    await createIndexSafely(mongoose.connection.collection('discussions'), { tags: 1 });
    await createIndexSafely(mongoose.connection.collection('discussions'), { isPinned: -1, createdAt: -1 });
    await createIndexSafely(mongoose.connection.collection('discussions'), { content: 'text', title: 'text' });

    // Analytics indexes
    await createIndexSafely(mongoose.connection.collection('analytics'), { userId: 1 });
    await createIndexSafely(mongoose.connection.collection('analytics'), { caseId: 1 });
    await createIndexSafely(mongoose.connection.collection('analytics'), { date: 1 });

    logger.info('Database indexes created/verified successfully');

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };