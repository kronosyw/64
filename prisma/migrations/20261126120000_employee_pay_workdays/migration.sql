-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PayBasis" AS ENUM ('MONTHLY', 'HOURLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "pay_basis" "PayBasis" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "work_days_per_week" INTEGER NOT NULL DEFAULT 5;

-- Backfill: part-timers default to hourly
UPDATE "employees" SET "pay_basis" = 'HOURLY' WHERE "role" = 'PARTTIME';

-- Unique name per branch (nullable branch_id rows remain unrestricted by Postgres UNIQUE semantics)
CREATE UNIQUE INDEX IF NOT EXISTS "employees_branch_id_name_key" ON "employees"("branch_id", "name");
