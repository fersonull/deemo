-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('analyzing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('scoring', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "DefenseMode" AS ENUM ('TITLE', 'PRE_ORAL', 'FINAL');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'STANDARD', 'HARD');

-- CreateEnum
CREATE TYPE "EndedBy" AS ENUM ('panel', 'student', 'time');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(128) NOT NULL,
    "email" VARCHAR(320),
    "name" VARCHAR(60),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "provider" VARCHAR(30),
    "avatar" VARCHAR(32),
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "allow_typing" BOOLEAN NOT NULL DEFAULT true,
    "consent_version" VARCHAR(20),
    "consent_at" TIMESTAMP(3),
    "session_day" VARCHAR(10),
    "session_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "domain" VARCHAR(30) NOT NULL,
    "file_name" VARCHAR(200) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "error" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "weights" INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "project_id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(2000) NOT NULL,
    "problem" VARCHAR(2000) NOT NULL,
    "objectives" VARCHAR(2000) NOT NULL,
    "method" VARCHAR(2000) NOT NULL,
    "scope" VARCHAR(2000) NOT NULL,
    "features" VARCHAR(2000) NOT NULL,
    "limits" VARCHAR(2000) NOT NULL,
    "results" VARCHAR(2000) NOT NULL,
    "facts" TEXT[],
    "unsure" TEXT[],
    "model" VARCHAR(40),

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "rubrics" (
    "project_id" VARCHAR(36) NOT NULL,
    "source" VARCHAR(200) NOT NULL,

    CONSTRAINT "rubrics_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "rubric_criteria" (
    "id" SERIAL NOT NULL,
    "rubric_id" VARCHAR(36) NOT NULL,
    "position" INTEGER NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "weight" INTEGER NOT NULL,
    "scored" BOOLEAN NOT NULL,
    "level1" VARCHAR(200) NOT NULL,
    "level3" VARCHAR(200) NOT NULL,
    "level5" VARCHAR(200) NOT NULL,

    CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "error" TEXT,
    "project_id" VARCHAR(100),
    "group_code" VARCHAR(6),
    "focus_area" VARCHAR(160),
    "weak_from" VARCHAR(100),
    "manuscript_context" TEXT,
    "title" VARCHAR(2000) NOT NULL,
    "mode" "DefenseMode" NOT NULL,
    "domain" VARCHAR(30) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "panelists" INTEGER NOT NULL,
    "follow_ups" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "ended_by" "EndedBy" NOT NULL,
    "weights" DOUBLE PRECISION[],
    "rubric" JSONB,
    "lines" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_turns" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR(36) NOT NULL,
    "position" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "follow_up" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "panelist" INTEGER NOT NULL,
    "question" VARCHAR(600) NOT NULL,
    "answer" VARCHAR(4000) NOT NULL,
    "latency_ms" INTEGER,
    "answer_ms" INTEGER NOT NULL,

    CONSTRAINT "session_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_flags" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR(36) NOT NULL,
    "position" INTEGER NOT NULL,
    "spoken_claim" VARCHAR(400) NOT NULL,
    "manuscript_evidence" VARCHAR(400) NOT NULL,
    "severity" "Severity" NOT NULL,
    "at_ms" INTEGER NOT NULL,

    CONSTRAINT "session_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "session_id" VARCHAR(36) NOT NULL,
    "score" INTEGER NOT NULL,
    "band" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "scored" BOOLEAN NOT NULL,
    "rubric_score" INTEGER NOT NULL,
    "penalty" DOUBLE PRECISION NOT NULL,
    "answered" INTEGER NOT NULL,
    "planned" INTEGER NOT NULL,
    "headline" TEXT NOT NULL,
    "model" VARCHAR(40),
    "latency_s" DOUBLE PRECISION,
    "fillers_per_min" DOUBLE PRECISION,
    "words_per_min" DOUBLE PRECISION,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "report_criteria" (
    "id" SERIAL NOT NULL,
    "report_id" VARCHAR(36) NOT NULL,
    "position" INTEGER NOT NULL,
    "key" VARCHAR(20) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "level" INTEGER,
    "why" TEXT NOT NULL,

    CONSTRAINT "report_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_contradictions" (
    "id" SERIAL NOT NULL,
    "report_id" VARCHAR(36) NOT NULL,
    "position" INTEGER NOT NULL,
    "spoken_claim" TEXT NOT NULL,
    "manuscript_evidence" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "turn" INTEGER,

    CONSTRAINT "report_contradictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_turns" (
    "id" SERIAL NOT NULL,
    "report_id" VARCHAR(36) NOT NULL,
    "position" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "better_answer" TEXT NOT NULL,

    CONSTRAINT "report_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_fixes" (
    "id" SERIAL NOT NULL,
    "report_id" VARCHAR(36) NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "turn" INTEGER,

    CONSTRAINT "report_fixes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "code" VARCHAR(6) NOT NULL,
    "owner_id" VARCHAR(128) NOT NULL,
    "project_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "group_members" (
    "group_code" VARCHAR(6) NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "share_score" BOOLEAN NOT NULL DEFAULT false,
    "focus_area" VARCHAR(160) NOT NULL DEFAULT '',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_code","user_id")
);

-- CreateTable
CREATE TABLE "live_starts" (
    "id" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "setup" TEXT NOT NULL,
    "lease" VARCHAR(36) NOT NULL,
    "pending_until" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT,
    "new_session_until" TIMESTAMP(3),

    CONSTRAINT "live_starts_pkey" PRIMARY KEY ("user_id","id")
);

-- CreateTable
CREATE TABLE "rate_limit_counters" (
    "key" VARCHAR(200) NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("key","window_start")
);

-- CreateIndex
CREATE INDEX "projects_user_id_created_at_idx" ON "projects"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_criteria_rubric_id_position_key" ON "rubric_criteria"("rubric_id", "position");

-- CreateIndex
CREATE INDEX "sessions_user_id_created_at_idx" ON "sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "sessions_group_code_idx" ON "sessions"("group_code");

-- CreateIndex
CREATE UNIQUE INDEX "session_turns_session_id_position_key" ON "session_turns"("session_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "session_flags_session_id_position_key" ON "session_flags"("session_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "report_criteria_report_id_position_key" ON "report_criteria"("report_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "report_contradictions_report_id_position_key" ON "report_contradictions"("report_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "report_turns_report_id_position_key" ON "report_turns"("report_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "report_fixes_report_id_position_key" ON "report_fixes"("report_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "groups_project_id_key" ON "groups"("project_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubric_criteria" ADD CONSTRAINT "rubric_criteria_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "rubrics"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_turns" ADD CONSTRAINT "session_turns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_flags" ADD CONSTRAINT "session_flags_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_criteria" ADD CONSTRAINT "report_criteria_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_contradictions" ADD CONSTRAINT "report_contradictions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_turns" ADD CONSTRAINT "report_turns_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_fixes" ADD CONSTRAINT "report_fixes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_code_fkey" FOREIGN KEY ("group_code") REFERENCES "groups"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_starts" ADD CONSTRAINT "live_starts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

