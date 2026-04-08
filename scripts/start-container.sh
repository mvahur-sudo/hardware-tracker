#!/bin/sh
set -eu

cd /app/apps/api
pnpm exec prisma generate
pnpm exec prisma migrate deploy
if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  pnpm exec prisma db seed
fi
node dist/main.js &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

cd /app
exec node server.js
