CREATE TABLE "push_tokens" (
    "token" VARCHAR(512) NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("token")
);

CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
