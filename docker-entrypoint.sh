#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npm run migration:up

echo "✅ Migrations completed successfully"

echo "🚀 Starting Next.js application..."
npm start &
APP_PID=$!

echo "⏳ Waiting for application to be ready..."
sleep 10

echo "🔧 Initializing application..."
curl -X POST "http://localhost:3000/api/util?action=init" || echo "⚠️ Init call failed, but continuing..."

echo "✅ Container startup complete!"
wait $APP_PID