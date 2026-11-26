#!/bin/sh
set -e
if [ -n "$DATABASE_URL_UNPOOLED" ]; then
  export DATABASE_URL="$DATABASE_URL_UNPOOLED"
elif [ -n "$POSTGRES_URL_NON_POOLING" ]; then
  export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
fi
npx prisma migrate deploy

# One-shot: SKADI employees + schedules → Neon (remove after successful prod deploy)
if [ -f scripts/data/skadi-employees-schedules.json ]; then
  echo "Running SKADI employees/schedules migrate..."
  npx tsx scripts/migrate-skadi-employees-schedules.ts --file scripts/data/skadi-employees-schedules.json
fi

npx next build
