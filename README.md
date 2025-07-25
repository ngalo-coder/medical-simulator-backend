# 🏥 Medical Case Simulator Backend

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-org/medical-case-simulator)
[![Test Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)](https://github.com/your-org/medical-case-simulator)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A world-class medical case simulator backend designed for clinical education and skill development. Built with enterprise-grade security, real-time collaboration, and comprehensive analytics.

## ✨ Features

### 🎯 Core Functionality
- **Interactive Case Simulations**: Step-by-step medical case scenarios with branching logic
- **Real-time Collaboration**: Socket.IO powered live sessions with multiple participants
- **Comprehensive Analytics**: Detailed performance tracking and learning insights
- **AI-Powered Recommendations**: Intelligent case suggestions based on learning patterns

### 🔒 Security & Performance
- **Enterprise Security**: JWT authentication, rate limiting, input sanitization
- **Production Ready**: Comprehensive error handling, monitoring, and logging
- **Scalable Architecture**: Redis caching, database optimization, clustering support
- **Health Monitoring**: Built-in health checks and performance metrics

### 🎮 Engagement Features
- **Gamification System**: Achievements, streaks, and progress tracking
- **Discussion Forums**: Threaded discussions with voting and moderation
- **Multi-role Support**: Students, instructors, and administrators
- **Progress Tracking**: Detailed learning analytics and competency mapping

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ LTS
- MongoDB 5.0+
- Redis 6.0+ (optional but recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/medical-case-simulator-backend.git
cd medical-case-simulator-backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your environment variables (see Configuration section)
nano .env

# Run database migrations
npm run migrate

# Seed the database with sample data (optional)
npm run seed

# Start development server
npm run dev
```

The server will start on `http://localhost:5000` with API documentation available at `/api-docs`.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/medical-case-simulator

# Security (Generate strong secrets!)
JWT_SECRET=your-super-secure-256-bit-secret-key-here
JWT_REFRESH_SECRET=your-different-refresh-secret-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Email Service (Optional)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@your-domain.com

# Feature Flags
ENABLE_REAL_TIME_COLLABORATION=true
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_GAMIFICATION=true
```

See `.env.example` for complete configuration options.

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode for development
npm run test:watch
```

### Test Coverage

The project maintains 95%+ test coverage across:
- Unit tests for models, services, and utilities
- Integration tests for API endpoints
- End-to-end tests for critical user flows

## 📚 API Documentation

### Interactive Documentation
Visit `/api-docs` when the server is running for interactive Swagger documentation.

### Key Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

**Cases:**
- `GET /api/cases` - List published cases
- `GET /api/cases/:id` - Get case details
- `POST /api/cases` - Create new case (instructors only)

**Simulation:**
- `POST /api/simulation/start/:caseId` - Start simulation session
- `POST /api/simulation/step/:sessionId` - Process simulation step
- `GET /api/simulation/session/:sessionId` - Get session status

**Real-time Events (Socket.IO):**
- `join_simulation` - Join simulation room
- `simulation_step_update` - Broadcast step completion
- `join_discussion` - Join case discussion
- `notification` - Receive real-time notifications

See [API Documentation](docs/API.md) for complete endpoint reference.

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+ with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for sessions and performance
- **Real-time**: Socket.IO for live collaboration
- **Authentication**: JWT with refresh tokens
- **Testing**: Jest with Supertest
- **Documentation**: Swagger/OpenAPI 3.0

### Project Structure
```
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── tests/           # Test suites
├── docs/            # Documentation
└── scripts/         # Utility scripts
```

## 🚀 Deployment

### Production Deployment

The application is production-ready with multiple deployment options:

**Option 1: Render.com (Recommended)**
```bash
# Deploy using the included render.yaml
git push origin main  # Auto-deploys on push
```

**Option 2: Docker**
```bash
# Build and run with Docker Compose
docker-compose up -d
```

**Option 3: Traditional VPS**
```bash
# Use PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js --env production
```

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

### Health Monitoring

```bash
# Check application health
npm run health-check

# Get detailed health status
curl https://your-domain.com/health

# Monitor with PM2
pm2 monit
```

## 🔧 Development

### Development Workflow

```bash
# Start development server with hot reload
npm run dev

# Run linting
npm run lint
npm run lint:fix

# Format code
npm run format

# Database operations
npm run migrate          # Run migrations
npm run migrate:status   # Check migration status
npm run seed            # Seed sample data
```

### Code Quality

The project enforces high code quality standards:
- **ESLint**: Code linting with security rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality checks
- **Jest**: Comprehensive test coverage
- **Security**: Regular dependency audits

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run quality checks: `npm run validate`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📊 Monitoring & Analytics

### Built-in Monitoring
- **Health Checks**: Comprehensive system health monitoring
- **Performance Metrics**: Request timing and resource usage
- **Error Tracking**: Detailed error logging and alerting
- **Security Monitoring**: Suspicious activity detection

### Metrics Dashboard
Access real-time metrics at `/api/admin/metrics` (admin only):
- Request performance and error rates
- Database and cache performance
- User activity and engagement
- System resource utilization

## 🔐 Security

### Security Features
- **Authentication**: JWT with secure refresh tokens
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Configurable rate limits per endpoint
- **Security Headers**: OWASP recommended headers
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization and CSP headers

### Security Best Practices
- Regular security audits with `npm audit`
- Dependency vulnerability scanning
- Secure environment variable management
- HTTPS enforcement in production
- Database connection encryption

## 📈 Performance

### Optimization Features
- **Caching**: Redis-based caching for frequently accessed data
- **Database Indexing**: Optimized database queries with proper indexes
- **Compression**: Gzip compression for API responses
- **Connection Pooling**: Efficient database connection management
- **Clustering**: Multi-process support with PM2

### Performance Monitoring
- Built-in performance metrics collection
- Slow query detection and logging
- Memory usage monitoring
- Response time tracking

## 🤝 Support

### Getting Help
- **Documentation**: Comprehensive guides in `/docs`
- **API Reference**: Interactive docs at `/api-docs`
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions

### Community
- **Contributing**: See [CONTRIBUTING.md](docs/CONTRIBUTING.md)
- **Code of Conduct**: See [CODE_OF_CONDUCT.md](docs/CODE_OF_CONDUCT.md)
- **Security**: Report security issues to security@your-domain.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Medical education professionals who provided domain expertise
- Open source community for excellent tools and libraries
- Contributors who helped improve the codebase

---

**Built with ❤️ for medical education**

For more information, visit our [documentation](docs/) or check out the [API reference](docs/API.md).