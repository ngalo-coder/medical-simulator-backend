# � Medical Case Simulator Backend

A world-class medical case simulator backend designed for clinical education and skill development.

## ✨ Features

- � **AI-Powered Recommendations** - Personalized case suggestions based on performance
- � **Advanced Learning Analytics** - Comprehensive progress tracking and competency assessment
- � **Gamification System** - Achievements, streaks, and engagement mechanics
- � **Real-time Collaboration** - Live discussions and instructor feedback
- � **Interactive Simulations** - Progressive case disclosure with realistic scenarios
- � **Enterprise Security** - JWT authentication, role-based access, and data encryption
- � **Multi-institutional Support** - Scalable architecture for healthcare organizations
- � **Performance Monitoring** - Real-time analytics and health monitoring

## � Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- MongoDB (local or Atlas)
- SendGrid account (for emails)

### Installation

1. **Clone and setup**
   ```bash
   git clone https://github.com/yourusername/medical-case-simulator-backend.git
   cd medical-case-simulator-backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Visit API Documentation**
   ```
   http://localhost:5000/api-docs
   ```

## � Project Structure

```
├── server.js              # Main application entry
├── config/                # Configuration files
├── models/                # Database models
├── routes/                # API routes
├── controllers/           # Business logic
├── services/              # Business services
├── middleware/            # Custom middleware
├── utils/                 # Utility functions
├── scripts/               # Database scripts
├── tests/                 # Test files
└── docs/                  # Documentation
```

## �️ Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Seed database
npm run seed
```

## � Deployment

### Render.com (Recommended)
1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables
4. Deploy with `render.yaml` configuration

### Docker
```bash
docker build -t medical-case-simulator .
docker run -p 5000:5000 medical-case-simulator
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## � API Documentation

- **Health Check**: `GET /health`
- **API Docs**: `GET /api-docs`
- **Authentication**: `POST /api/auth/login`
- **Cases**: `GET /api/cases`
- **Simulation**: `POST /api/simulation/start/:caseId`

Full API documentation available at `/api-docs` when running.

## � Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

## � License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## � Support

- � [Documentation](docs/)
- � [Issue Tracker](https://github.com/yourusername/medical-case-simulator-backend/issues)
- � [Discussions](https://github.com/yourusername/medical-case-simulator-backend/discussions)

## � Roadmap

- [ ] Advanced AI recommendations
- [ ] Multi-language support
- [ ] Mobile app integration
- [ ] VR/AR case simulations
- [ ] Advanced reporting dashboard

---

Built with ❤️ for medical education
