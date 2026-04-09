#!/bin/sh
set -eu

cd /app/apps/api
pnpm exec prisma generate
pnpm exec prisma migrate deploy

# Seed runs in background, won't block startup
if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "Starting database seed in background..."
  TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' npx ts-node --transpile-only --skip-project -O '{"module":"CommonJS","moduleResolution":"Node"}' prisma/seed.ts &
  SEED_PID=$!
  echo "Seed PID: $SEED_PID"
fi

echo "Starting API server..."
node dist/main.js &
API_PID=$!

cleanup() {
  echo "Cleaning up..."
  kill "$SEED_PID" 2>/dev/null || true
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

cd /app
exec node server.js
