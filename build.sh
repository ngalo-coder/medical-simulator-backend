#!/bin/bash
set -e

echo "í¿—ï¸  Building Medical Case Simulator Backend..."

# Install dependencies
echo "í³¦ Installing production dependencies..."
npm ci --only=production

# Create necessary directories
echo "í³ Creating application directories..."
mkdir -p logs uploads temp

# Set permissions
echo "í´ Setting permissions..."
chmod +x start.sh

# Verify critical files
echo "âœ… Verifying build artifacts..."
if [ ! -f "server.js" ]; then
    echo "âŒ server.js not found!"
    exit 1
fi

echo "âœ… Build completed successfully!"
