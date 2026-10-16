-- CreateTable
CREATE TABLE "admin_actions" (
    "id" SERIAL NOT NULL,
    "admin_id" VARCHAR(128) NOT NULL,
    "admin_email" VARCHAR(320),
    "action" VARCHAR(40) NOT NULL,
    "target_id" VARCHAR(128) NOT NULL,
    "target_email" VARCHAR(320),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions"("created_at");

