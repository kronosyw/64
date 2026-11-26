#!/bin/sh
set -e
if [ -n "$DATABASE_URL_UNPOOLED" ]; then
  export DATABASE_URL="$DATABASE_URL_UNPOOLED"
elif [ -n "$POSTGRES_URL_NON_POOLING" ]; then
  export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
fi
npx prisma migrate deploy
# One-shot: merge duplicate Songpa/Yatap branches (64SP/64BY → SP01/YT01).
npx tsx scripts/merge-duplicate-branches.ts
npx next build
