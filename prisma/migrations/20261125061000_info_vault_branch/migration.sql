-- Delete orphan vault rows without a branch before enforcing NOT NULL
DELETE FROM "info_files";
DELETE FROM "info_records";

-- AlterTable
ALTER TABLE "info_records" ADD COLUMN "branch_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "info_records_branch_id_created_at_idx" ON "info_records"("branch_id", "created_at");

-- AddForeignKey
ALTER TABLE "info_records" ADD CONSTRAINT "info_records_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
