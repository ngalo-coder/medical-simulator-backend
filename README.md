# Ìø• Medical Case Simulator Backend

A world-class medical case simulator backend designed for clinical education and skill development.

## ‚ú® Features

- Ì∑† **AI-Powered Recommendations** - Personalized case suggestions based on performance
- Ì≥ä **Advanced Learning Analytics** - Comprehensive progress tracking and competency assessment
- ÌæÆ **Gamification System** - Achievements, streaks, and engagement mechanics
- Ì¥ù **Real-time Collaboration** - Live discussions and instructor feedback
- Ì≥± **Interactive Simulations** - Progressive case disclosure with realistic scenarios
- Ì¥í **Enterprise Security** - JWT authentication, role-based access, and data encryption
- Ìºê **Multi-institutional Support** - Scalable architecture for healthcare organizations
- Ì≥à **Performance Monitoring** - Real-time analytics and health monitoring

## Ì∫Ä Quick Start

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

## Ì≥Å Project Structure

```
‚îú‚îÄ‚îÄ server.js              # Main application entry
‚îú‚îÄ‚îÄ config/                # Configuration files
‚îú‚îÄ‚îÄ models/                # Database models
‚îú‚îÄ‚îÄ routes/                # API routes
‚îú‚îÄ‚îÄ controllers/           # Business logic
‚îú‚îÄ‚îÄ services/              # Business services
‚îú‚îÄ‚îÄ middleware/            # Custom middleware
‚îú‚îÄ‚îÄ utils/                 # Utility functions
‚îú‚îÄ‚îÄ scripts/               # Database scripts
‚îú‚îÄ‚îÄ tests/                 # Test files
‚îî‚îÄ‚îÄ docs/                  # Documentation
```

## Ìª†Ô∏è Development

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

## Ì∫Ä Deployment

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

## Ì≥ö API Documentation

- **Health Check**: `GET /health`
- **API Docs**: `GET /api-docs`
- **Authentication**: `POST /api/auth/login`
- **Cases**: `GET /api/cases`
- **Simulation**: `POST /api/simulation/start/:caseId`

Full API documentation available at `/api-docs` when running.

## Ì¥ù Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

## Ì≥Ñ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Ì∂ò Support

- Ì≥ñ [Documentation](docs/)
- Ì∞õ [Issue Tracker](https://github.com/yourusername/medical-case-simulator-backend/issues)
- Ì≤¨ [Discussions](https://github.com/yourusername/medical-case-simulator-backend/discussions)

## ÌæØ Roadmap

- [ ] Advanced AI recommendations
- [ ] Multi-language support
- [ ] Mobile app integration
- [ ] VR/AR case simulations
- [ ] Advanced reporting dashboard

---

Built with ‚ù§Ô∏è for medical education
