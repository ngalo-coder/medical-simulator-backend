// Medical Case Simulator - Main Server Entry Point
// This is a starter template - full implementation in separate artifact

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Medical Case Simulator Backend API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Database connection
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('âœ… Connected to MongoDB');
    } else {
      console.log('âš ï¸  MONGODB_URI not set, skipping database connection');
    }
  } catch (error) {
    console.error('âŒ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`íº€ Medical Case Simulator Backend running on port ${PORT}`);
    console.log(`í³š Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`í´— Health check: http://localhost:${PORT}/health`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`í³– Base URL: http://localhost:${PORT}`);
    }
  });
};

startServer().catch(console.error);

module.exports = app;
