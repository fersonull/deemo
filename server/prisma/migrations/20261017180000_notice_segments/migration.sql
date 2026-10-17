ALTER TABLE "notices" ADD COLUMN "segment" VARCHAR(400);

CREATE TABLE "notice_recipients" (
    "notice_id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    CONSTRAINT "notice_recipients_pkey" PRIMARY KEY ("notice_id", "user_id")
);

CREATE INDEX "notice_recipients_user_id_idx" ON "notice_recipients"("user_id");
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
