-- CreateTable
CREATE TABLE "board_posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_notice" BOOLEAN NOT NULL DEFAULT false,
    "is_all" BOOLEAN NOT NULL DEFAULT false,
    "author_id" INTEGER NOT NULL,
    "author_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_post_branches" (
    "post_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,

    CONSTRAINT "board_post_branches_pkey" PRIMARY KEY ("post_id","branch_id")
);

-- CreateIndex
CREATE INDEX "board_posts_is_notice_created_at_idx" ON "board_posts"("is_notice", "created_at");

-- CreateIndex
CREATE INDEX "board_post_branches_branch_id_idx" ON "board_post_branches"("branch_id");

-- AddForeignKey
ALTER TABLE "board_posts" ADD CONSTRAINT "board_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_post_branches" ADD CONSTRAINT "board_post_branches_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "board_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_post_branches" ADD CONSTRAINT "board_post_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
