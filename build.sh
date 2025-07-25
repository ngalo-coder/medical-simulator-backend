#!/bin/bash
set -e

echo "🏗️  Building Medical Case Simulator Backend..."

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Create required directories
echo "📁 Creating application directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p temp

# Set appropriate permissions
echo "🔐 Setting file permissions..."
find . -name "*.sh" -exec chmod +x {} \;

# Run any additional build steps
echo "🔨 Running build optimizations..."
npm run build 2>/dev/null || echo "ℹ️  No build script found, continuing..."

# Verify critical files exist
echo "✅ Verifying build artifacts..."
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found!"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

echo "✅ Build completed successfully!"