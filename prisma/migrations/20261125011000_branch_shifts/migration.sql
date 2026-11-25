-- CreateTable
CREATE TABLE "branch_shifts" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "is_off" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#1a73e8',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_shifts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN "shift_id" INTEGER,
ADD COLUMN "shift_name" TEXT;

-- CreateIndex
CREATE INDEX "branch_shifts_branch_id_sort_order_idx" ON "branch_shifts"("branch_id", "sort_order");

-- AddForeignKey
ALTER TABLE "branch_shifts" ADD CONSTRAINT "branch_shifts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "branch_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed one set of shifts per existing branch
INSERT INTO "branch_shifts" ("branch_id", "name", "start_time", "end_time", "is_off", "color", "sort_order", "updated_at")
SELECT b.id, v.name, v.start_time, v.end_time, v.is_off, v.color, v.sort_order, CURRENT_TIMESTAMP
FROM "branches" b
CROSS JOIN (
    VALUES
        ('오픈', '10:00'::text, '16:00'::text, false, '#1a73e8', 0),
        ('마감', '16:00', '22:00', false, '#188038', 1),
        ('오픈마감', '10:00', '22:00', false, '#e37400', 2),
        ('저녁PT', '18:00', '22:00', false, '#a142f4', 3),
        ('풀타임PT', '10:00', '22:00', false, '#d93025', 4),
        ('휴무', NULL, NULL, true, '#5f6368', 5)
) AS v(name, start_time, end_time, is_off, color, sort_order);

-- Attach existing schedules to the matching branch shift
UPDATE "schedules" AS s
SET "shift_id" = bs.id,
    "shift_name" = bs.name
FROM "branch_shifts" AS bs
WHERE bs.branch_id = s.branch_id
  AND (
    (s.work_type = 'OPEN' AND bs.name = '오픈')
    OR (s.work_type = 'CLOSE' AND bs.name = '마감')
    OR (s.work_type = 'OPEN_CLOSE' AND bs.name = '오픈마감')
    OR (s.work_type = 'EVENING_PT' AND bs.name = '저녁PT')
    OR (s.work_type = 'FULL_PT' AND bs.name = '풀타임PT')
    OR (s.work_type = 'OFF' AND bs.name = '휴무')
  );
