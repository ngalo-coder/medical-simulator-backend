#!/bin/bash

# í¿¥ Medical Case Simulator Backend - Automated Setup Script
# This script creates the complete project structure and sets up everything

set -e  # Exit on any error

echo "í¿¥ Medical Case Simulator Backend Setup"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project name
read -p "Enter project directory name (default: medical-case-simulator-backend): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-"medical-case-simulator-backend"}

echo -e "${BLUE}Creating project: $PROJECT_NAME${NC}"

# Create main project directory
if [ -d "$PROJECT_NAME" ]; then
    echo -e "${YELLOW}Directory $PROJECT_NAME already exists!${NC}"
    read -p "Do you want to continue and overwrite? (y/N): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        echo "Setup cancelled."
        exit 1
    fi
    rm -rf "$PROJECT_NAME"
fi

mkdir "$PROJECT_NAME"
cd "$PROJECT_NAME"

echo -e "${GREEN}âœ… Created project directory${NC}"

# Create directory structure
echo "í³ Creating directory structure..."

mkdir -p {config,models,routes,middleware,controllers,services,utils,scripts}
mkdir -p {tests/{unit,integration,fixtures},docs/images,public/uploads,logs,workers}
mkdir -p {deployment/{kubernetes,terraform}}

echo -e "${GREEN}âœ… Directory structure created${NC}"

# Initialize npm project
echo "í³¦ Initializing npm project..."

cat > package.json << 'EOF'
{
  "name": "medical-case-simulator-backend",
  "version": "1.0.0",
  "description": "World-class medical case simulator backend for clinical education",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'Build completed successfully'",
    "test": "jest --verbose",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "seed": "node scripts/seedDatabase.js",
    "migrate": "node scripts/migrate.js",
    "worker": "node workers/index.js",
    "docs": "jsdoc -c jsdoc.conf.json",
    "health-check": "node scripts/healthCheck.js"
  },
  "keywords": ["medical", "education", "simulation", "healthcare", "learning", "clinical"],
  "author": "Medical Education Team",
  "license": "MIT",
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^6.8.1",
    "multer": "^1.4.5-lts.1",
    "winston": "^3.10.0",
    "socket.io": "^4.7.2",
    "joi": "^17.9.2",
    "nodemailer": "^6.9.4",
    "ioredis": "^5.3.2",
    "agenda": "^5.0.0",
    "express-validator": "^7.0.1",
    "swagger-jsdoc": "^6.2.5",
    "swagger-ui-express": "^5.0.0",
    "csv-parser": "^3.0.0",
    "xlsx": "^0.18.5",
    "pdf-kit": "^0.13.0",
    "sharp": "^0.32.4",
    "aws-sdk": "^2.1450.0",
    "stripe": "^13.4.0",
    "passport": "^0.6.0",
    "passport-local": "^1.0.0",
    "passport-google-oauth20": "^2.0.0",
    "express-session": "^1.17.3",
    "connect-mongo": "^5.0.0",
    "node-cron": "^3.0.2",
    "moment": "^2.29.4",
    "lodash": "^4.17.21",
    "@sendgrid/mail": "^7.7.0",
    "bull": "^4.10.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3",
    "eslint": "^8.47.0",
    "eslint-config-standard": "^17.1.0",
    "eslint-plugin-import": "^2.28.1",
    "eslint-plugin-node": "^11.1.0",
    "eslint-plugin-promise": "^6.1.1",
    "prettier": "^3.0.2",
    "husky": "^8.0.3",
    "lint-staged": "^14.0.1",
    "jsdoc": "^4.0.2",
    "mongodb-memory-server": "^8.15.1",
    "@types/jest": "^29.5.4",
    "cross-env": "^7.0.3"
  }
}
