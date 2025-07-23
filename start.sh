#!/bin/bash
set -e

echo "� Starting Medical Case Simulator Backend..."

# Environment validation
if [ -z "$MONGODB_URI" ]; then
    echo "❌ MONGODB_URI environment variable is not set"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET environment variable is not set"
    exit 1
fi

# Seed database if needed
if [ "$SEED_DATABASE" = "true" ]; then
    echo "� Seeding database..."
    npm run seed || echo "⚠️  Database seeding failed, continuing..."
fi

# Start the application
echo "� Starting server on port ${PORT:-10000}..."
exec npm start
