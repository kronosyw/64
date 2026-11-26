#!/bin/sh
set -e
if [ -n "$DATABASE_URL_UNPOOLED" ]; then
  export DATABASE_URL="$DATABASE_URL_UNPOOLED"
elif [ -n "$POSTGRES_URL_NON_POOLING" ]; then
  export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
fi
npx prisma migrate deploy
# One-shot SKADI ads dump import (idempotent upserts). Remove after cutover.
if [ -f json_data/export_ads.json ]; then
  echo "Importing ads dump from json_data/export_ads.json ..."
  npx tsx scripts/migrate-skadi-ads.ts --file json_data/export_ads.json
fi
npx next build
