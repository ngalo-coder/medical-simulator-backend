const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const caseRoutes = require('./cases');
const simulationRoutes = require('./simulation');
const analyticsRoutes = require('./analytics');
const adminRoutes = require('./admin');
const recommendationRoutes = require('./recommendations');
const discussionRoutes = require('./discussions');

// Health check route (no auth required)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    }
  });
});

// Mount API routes
router.use('/auth', authRoutes);
router.use('/cases', caseRoutes);
router.use('/simulation', simulationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/discussions', discussionRoutes);

module.exports = router;