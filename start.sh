#!/bin/bash
set -e

echo "Ì∫Ä Starting Medical Case Simulator Backend..."

# Environment validation
if [ -z "$MONGODB_URI" ]; then
    echo "‚ùå MONGODB_URI environment variable is not set"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "‚ùå JWT_SECRET environment variable is not set"
    exit 1
fi

# Seed database if needed
if [ "$SEED_DATABASE" = "true" ]; then
    echo "Ìº± Seeding database..."
    npm run seed || echo "‚ö†Ô∏è  Database seeding failed, continuing..."
fi

# Start the application
echo "ÌæØ Starting server on port ${PORT:-10000}..."
exec npm start
