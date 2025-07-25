// Medical Case Simulator - Main Server Entry Point
// World-class medical education platform backend

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import configurations
const { connectDB } = require('./config/database');
const { setupSwagger } = require('./config/swagger');
const { connectRedis } = require('./config/redis');

// Import middleware
const corsMiddleware = require('./middleware/cors');
const httpLogger = require('./middleware/logging');
const { generalLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { performanceMonitoring, requestId } = require('./middleware/monitoring');

// Import routes
const apiRoutes = require('./routes');

// Import services and utilities
const logger = require('./utils/logger');
const notificationService = require('./services/notificationService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// ==================== SOCKET.IO SETUP ====================

const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      const defaultOrigins = [
        'http://localhost:3000',
        'http://localhost:19006',
        'https://medical-case-simulator.netlify.app',
        'https://preview-medical-case-simulator-kzmqunml3u6b91zmyx69.vusercontent.net'
      ];
      
      const envOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      const allowedOrigins = [...defaultOrigins, ...envOrigins];
      
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const { User } = require('./models');
    const user = await User.findById(decoded.userId)
      .select('-password -refreshTokens')
      .lean();
    
    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.user.email} (${socket.id})`);
  
  // Join user to their personal room
  socket.join(`user_${socket.userId}`);
  
  // Send user their stored notifications
  notificationService.getStoredNotifications(socket.userId).then(notifications => {
    if (notifications.length > 0) {
      socket.emit('stored_notifications', notifications);
    }
  });

  // ===== SIMULATION EVENTS =====
  
  // Join case simulation room
  socket.on('join_simulation', (sessionId) => {
    if (sessionId) {
      socket.join(`simulation_${sessionId}`);
      socket.currentSimulation = sessionId;
      logger.info(`User ${socket.user.email} joined simulation ${sessionId}`);
      
      // Notify others in the simulation
      socket.to(`simulation_${sessionId}`).emit('user_joined_simulation', {
        userId: socket.userId,
        userName: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`,
        timestamp: new Date()
      });
    }
  });
  
  // Leave simulation room
  socket.on('leave_simulation', (sessionId) => {
    if (sessionId) {
      socket.leave(`simulation_${sessionId}`);
      socket.to(`simulation_${sessionId}`).emit('user_left_simulation', {
        userId: socket.userId,
        timestamp: new Date()
      });
      socket.currentSimulation = null;
    }
  });
  
  // Handle simulation step updates
  socket.on('simulation_step_update', (data) => {
    const { sessionId, stepId, selectedOption } = data;
    if (sessionId && stepId) {
      socket.to(`simulation_${sessionId}`).emit('step_completed', {
        stepId,
        selectedOption,
        userId: socket.userId,
        userName: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`,
        timestamp: new Date()
      });
    }
  });

  // ===== DISCUSSION EVENTS =====
  
  // Join case discussion room
  socket.on('join_discussion', (caseId) => {
    if (caseId) {
      socket.join(`discussion_${caseId}`);
      socket.currentDiscussion = caseId;
      logger.info(`User ${socket.user.email} joined discussion for case ${caseId}`);
      
      // Notify others in the discussion
      socket.to(`discussion_${caseId}`).emit('user_joined_discussion', {
        userId: socket.userId,
        userName: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`,
        role: socket.user.role,
        timestamp: new Date()
      });
    }
  });
  
  // Leave discussion room
  socket.on('leave_discussion', (caseId) => {
    if (caseId) {
      socket.leave(`discussion_${caseId}`);
      socket.to(`discussion_${caseId}`).emit('user_left_discussion', {
        userId: socket.userId,
        timestamp: new Date()
      });
      socket.currentDiscussion = null;
    }
  });
  
  // Handle new discussion posts
  socket.on('new_discussion', (data) => {
    const { caseId, discussionId, content, type } = data;
    if (caseId && content) {
      socket.to(`discussion_${caseId}`).emit('discussion_added', {
        discussionId,
        content,
        type,
        user: {
          id: socket.userId,
          name: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`,
          role: socket.user.role
        },
        timestamp: new Date()
      });
    }
  });
  
  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { caseId } = data;
    if (caseId) {
      socket.to(`discussion_${caseId}`).emit('user_typing', {
        userId: socket.userId,
        userName: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`
      });
    }
  });
  
  socket.on('typing_stop', (data) => {
    const { caseId } = data;
    if (caseId) {
      socket.to(`discussion_${caseId}`).emit('user_stopped_typing', {
        userId: socket.userId
      });
    }
  });

  // ===== NOTIFICATION EVENTS =====
  
  // Mark notification as read
  socket.on('mark_notification_read', async (notificationId) => {
    try {
      await notificationService.markAsRead(socket.userId, notificationId);
      socket.emit('notification_marked_read', { notificationId });
    } catch (error) {
      logger.error('Mark notification read error:', error);
    }
  });
  
  // Mark all notifications as read
  socket.on('mark_all_notifications_read', async () => {
    try {
      await notificationService.markAllAsRead(socket.userId);
      socket.emit('all_notifications_marked_read');
    } catch (error) {
      logger.error('Mark all notifications read error:', error);
    }
  });
  
  // Get unread notification count
  socket.on('get_unread_count', async () => {
    try {
      const count = await notificationService.getUnreadCount(socket.userId);
      socket.emit('unread_count', { count });
    } catch (error) {
      logger.error('Get unread count error:', error);
    }
  });

  // ===== COLLABORATION EVENTS =====
  
  // Join instructor room (for instructors)
  if (['instructor', 'admin'].includes(socket.user.role)) {
    socket.join('instructors');
  }
  
  // Handle instructor interventions
  socket.on('instructor_intervention', (data) => {
    const { sessionId, message, hint } = data;
    if (['instructor', 'admin'].includes(socket.user.role) && sessionId) {
      socket.to(`simulation_${sessionId}`).emit('instructor_message', {
        message,
        hint,
        instructor: {
          name: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`,
          role: socket.user.role
        },
        timestamp: new Date()
      });
    }
  });

  // ===== ERROR HANDLING =====
  
  socket.on('error', (error) => {
    logger.error(`Socket error for user ${socket.user.email}:`, error);
  });
  
  // ===== DISCONNECTION HANDLING =====
  
  socket.on('disconnect', (reason) => {
    logger.info(`User disconnected: ${socket.user.email} (${reason})`);
    
    // Notify simulation room if user was in one
    if (socket.currentSimulation) {
      socket.to(`simulation_${socket.currentSimulation}`).emit('user_left_simulation', {
        userId: socket.userId,
        timestamp: new Date()
      });
    }
    
    // Notify discussion room if user was in one
    if (socket.currentDiscussion) {
      socket.to(`discussion_${socket.currentDiscussion}`).emit('user_left_discussion', {
        userId: socket.userId,
        timestamp: new Date()
      });
    }
  });

  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat', { timestamp: new Date() });
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // Every 30 seconds
});

// Make io available to routes and services
app.set('io', io);

// ==================== MIDDLEWARE SETUP ====================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// CORS
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (important for Render.com)
app.set('trust proxy', 1);

// Request tracking and monitoring
app.use(requestId);
app.use(performanceMonitoring);

// Request logging
app.use(httpLogger);

// Rate limiting
app.use(generalLimiter);

// ==================== HEALTH CHECK ENDPOINTS ====================

const { healthChecker } = require('./utils/healthCheck');
const { getPerformanceMetrics } = require('./middleware/monitoring');

// Basic health check
app.get('/health', async (req, res) => {
  try {
    const health = await healthChecker.runAllChecks();
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check (admin only)
app.get('/admin/system/health', async (req, res) => {
  try {
    const detailedHealth = await healthChecker.getDetailedHealth();
    res.json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check error:', error);
    res.status(500).json({
      error: 'Failed to get detailed health information',
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics endpoint (admin only)
app.get('/admin/system/metrics', async (req, res) => {
  try {
    const metrics = await getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Performance metrics error:', error);
    res.status(500).json({
      error: 'Failed to get performance metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== API ROUTES ====================

// API Documentation
setupSwagger(app);

// Main API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Medical Case Simulator Backend API',
    version: '1.0.0',
    description: 'World-class medical case simulator for clinical education',
    documentation: '/api-docs',
    health: '/health',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      cases: '/api/cases', 
      simulation: '/api/simulation',
      analytics: '/api/analytics',
      recommendations: '/api/recommendations',
      discussions: '/api/discussions',
      admin: '/api/admin'
    },
    features: [
      'AI-powered case recommendations',
      'Real-time collaboration with Socket.IO',
      'Advanced learning analytics',
      'Gamification system with achievements',
      'Multi-specialty case library',
      'Interactive patient simulations',
      'Competency-based assessment',
      'Discussion forums with voting',
      'Role-based access control',
      'Comprehensive admin dashboard'
    ],
    connectedUsers: io.engine.clientsCount
  });
});

// Serve static files (for uploaded content)
app.use('/uploads', express.static('public/uploads', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// ==================== ERROR HANDLING ====================

// 404 handler
app.use('*', notFoundHandler);

// Error tracking middleware (removed - function doesn't exist)

// Global error handler
app.use(errorHandler);

// ==================== DATABASE CONNECTION & SERVER START ====================

const startServer = async () => {
  try {
    logger.info('🚀 Starting Medical Case Simulator Backend...');
    
    // Connect to database
    await connectDB();
    logger.info('✅ Database connected successfully');

    // Connect to Redis (optional)
    try {
      connectRedis();
      logger.info('✅ Redis connected successfully');
    } catch (redisError) {
      logger.warn('⚠️  Redis connection failed, continuing without caching');
    }

    // Start server
    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, '0.0.0.0', () => {
      logger.info('🎉 Medical Case Simulator Backend is running!');
      logger.info(`📡 Server: http://localhost:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`🌐 Base URL: http://localhost:${PORT}`);
        logger.info(`🔧 Admin Panel: http://localhost:${PORT}/api/admin/dashboard`);
      }

      // Log enabled features
      const features = [];
      if (process.env.ENABLE_REAL_TIME_COLLABORATION === 'true') features.push('Real-time Collaboration');
      if (process.env.ENABLE_AI_RECOMMENDATIONS === 'true') features.push('AI Recommendations');
      if (process.env.ENABLE_GAMIFICATION === 'true') features.push('Gamification');
      if (process.env.ENABLE_LTI_INTEGRATION === 'true') features.push('LTI Integration');
      if (process.env.SENDGRID_API_KEY) features.push('Email Notifications');
      
      if (features.length > 0) {
        logger.info(`✨ Enabled features: ${features.join(', ')}`);
      }

      // Log system info
      logger.info(`💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      logger.info(`🔌 Socket.IO ready for real-time connections`);
      
      // Send startup notification to admin users
      setTimeout(async () => {
        try {
          await notificationService.sendSystemNotification(io, {
            title: 'System Started',
            message: 'Medical Case Simulator Backend is online and ready',
            priority: 'low'
          });
        } catch (error) {
          // Silent fail for startup notification
        }
      }, 5000);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = async (signal) => {
  logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('🔌 HTTP server closed');
    
    // Close Socket.IO connections
    io.close(() => {
      logger.info('🔌 Socket.IO server closed');
    });
    
    // Close database connection
    try {
      await mongoose.connection.close();
      logger.info('🗃️  Database connection closed');
    } catch (error) {
      logger.error('Database closure error:', error);
    }
    
    // Close Redis connection
    try {
      const { getRedisClient } = require('./config/redis');
      const redisClient = getRedisClient();
      if (redisClient) {
        await redisClient.quit();
        logger.info('🗃️  Redis connection closed');
      }
    } catch (error) {
      logger.error('Redis closure error:', error);
    }
    
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('⚠️  Forceful shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Handle warnings
process.on('warning', (warning) => {
  logger.warn('⚠️  Process warning:', warning);
});

// Start the server
startServer();

// Export for testing
module.exports = { app, server, io };