#!/bin/bash
set -e

echo "�️  Building Medical Case Simulator Backend..."

# Install dependencies
echo "� Installing production dependencies..."
npm ci --only=production

# Create necessary directories
echo "� Creating application directories..."
mkdir -p logs uploads temp

# Set permissions
echo "� Setting permissions..."
chmod +x start.sh

# Verify critical files
echo "✅ Verifying build artifacts..."
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found!"
    exit 1
fi

echo "✅ Build completed successfully!"
