#!/bin/bash
set -e

echo "🚀 Starting Medical Case Simulator Backend..."

# Environment validation
echo "🔍 Validating environment..."

if [ -z "$NODE_ENV" ]; then
    echo "⚠️  NODE_ENV not set, defaulting to production"
    export NODE_ENV=production
fi

if [ -z "$PORT" ]; then
    echo "⚠️  PORT not set, defaulting to 10000"
    export PORT=10000
fi

# Critical environment variables check
REQUIRED_VARS=("MONGODB_URI" "JWT_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment validation passed"

# Database seeding (only on first deployment or when explicitly requested)
if [ "$SEED_DATABASE" = "true" ]; then
    echo "🌱 Seeding database with sample data..."
    npm run seed || echo "⚠️  Database seeding failed, continuing..."
fi

# Health check before starting
echo "🔍 Pre-flight health check..."
node -e "
    console.log('Node.js version:', process.version);
    console.log('Memory usage:', process.memoryUsage());
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Port:', process.env.PORT);
" || exit 1

# Start the application
echo "🎯 Starting Medical Case Simulator on port $PORT..."
exec node server.js