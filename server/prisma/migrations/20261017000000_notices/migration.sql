CREATE TABLE "notices" (
    "id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "target_id" VARCHAR(128),
    "created_by" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notice_reads" (
    "user_id" VARCHAR(128) NOT NULL,
    "notice_id" VARCHAR(36) NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notice_reads_pkey" PRIMARY KEY ("user_id", "notice_id")
);

CREATE INDEX "notices_created_at_idx" ON "notices"("created_at");
CREATE INDEX "notices_target_id_created_at_idx" ON "notices"("target_id", "created_at");
CREATE INDEX "notice_reads_read_at_idx" ON "notice_reads"("read_at");
ALTER TABLE "notices" ADD CONSTRAINT "notices_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
