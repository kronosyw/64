-- CreateTable
CREATE TABLE "info_records" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "author_id" INTEGER,
    "author_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "info_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "info_files" (
    "id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL DEFAULT 'FILE',
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "info_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "info_records_created_at_idx" ON "info_records"("created_at");

-- CreateIndex
CREATE INDEX "info_files_record_id_idx" ON "info_files"("record_id");

-- AddForeignKey
ALTER TABLE "info_files" ADD CONSTRAINT "info_files_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "info_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
