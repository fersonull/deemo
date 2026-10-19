ALTER TABLE "sessions" ADD COLUMN "agenda" JSONB;
ALTER TABLE "session_turns" ADD COLUMN "topic" VARCHAR(60);
