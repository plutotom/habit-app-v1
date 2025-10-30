CREATE TYPE "public"."checkin_source" AS ENUM('manual', 'timer');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('pending', 'processing', 'ready', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."export_type" AS ENUM('csv', 'json');--> statement-breakpoint
CREATE TYPE "public"."freeze_status" AS ENUM('available', 'used', 'expired');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."per_period" AS ENUM('day', 'week', 'month');--> statement-breakpoint
CREATE TYPE "public"."schedule_type" AS ENUM('daily', 'weekly', 'monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."skip_policy" AS ENUM('none', 'allow_skips', 'vacation');--> statement-breakpoint
CREATE TYPE "public"."track_type" AS ENUM('binary', 'count', 'duration', 'timer');--> statement-breakpoint
CREATE TYPE "public"."week_start" AS ENUM('mon', 'sun');--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"local_day" date NOT NULL,
	"quantity" numeric,
	"source" "checkin_source" DEFAULT 'manual' NOT NULL,
	"note" text,
	"is_skip" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_skip_quantity_check" CHECK (NOT ("checkins"."is_skip" AND "checkins"."quantity" IS NOT NULL AND "checkins"."quantity" <> 0))
);
--> statement-breakpoint
CREATE TABLE "events_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_id" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"export_type" "export_type" DEFAULT 'csv' NOT NULL,
	"params" jsonb NOT NULL,
	"status" "export_status" DEFAULT 'pending' NOT NULL,
	"storage_key" text,
	"result_url" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "freeze_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_id" uuid,
	"covered_habit_id" uuid,
	"status" "freeze_status" DEFAULT 'available' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"covered_local_day" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_analytics_daily" (
	"habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"completions" integer DEFAULT 0 NOT NULL,
	"target" integer,
	"completion_rate" numeric,
	"strength_score" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habit_analytics_daily_habit_id_date_pk" PRIMARY KEY("habit_id","date")
);
--> statement-breakpoint
CREATE TABLE "habit_custom_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"rule_key" text NOT NULL,
	"rule_value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"category" text,
	"track_type" "track_type" NOT NULL,
	"schedule_type" "schedule_type" NOT NULL,
	"count_target" integer,
	"per_period" "per_period",
	"allowed_days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"day_boundary_offset_minutes" integer DEFAULT 0 NOT NULL,
	"skip_policy" "skip_policy" DEFAULT 'none' NOT NULL,
	"freeze_enabled" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"user_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limits_user_id_bucket_pk" PRIMARY KEY("user_id","bucket")
);
--> statement-breakpoint
CREATE TABLE "streaks_cache" (
	"habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_success_local_day" date,
	"current_chain_start" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "streaks_cache_habit_id_pk" PRIMARY KEY("habit_id")
);
--> statement-breakpoint
CREATE TABLE "user_counters" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"freeze_tokens_available" integer DEFAULT 0 NOT NULL,
	"last_freeze_grant_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"timezone" text NOT NULL,
	"week_start" "week_start" DEFAULT 'mon' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events_log" ADD CONSTRAINT "events_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freeze_tokens" ADD CONSTRAINT "freeze_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freeze_tokens" ADD CONSTRAINT "freeze_tokens_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freeze_tokens" ADD CONSTRAINT "freeze_tokens_covered_habit_id_habits_id_fk" FOREIGN KEY ("covered_habit_id") REFERENCES "public"."habits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_analytics_daily" ADD CONSTRAINT "habit_analytics_daily_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_analytics_daily" ADD CONSTRAINT "habit_analytics_daily_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_custom_rules" ADD CONSTRAINT "habit_custom_rules_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks_cache" ADD CONSTRAINT "streaks_cache_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks_cache" ADD CONSTRAINT "streaks_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_counters" ADD CONSTRAINT "user_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkins_habit_date_idx" ON "checkins" USING btree ("habit_id","occurred_at");--> statement-breakpoint
CREATE INDEX "checkins_user_date_idx" ON "checkins" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_skip_unique" ON "checkins" USING btree ("habit_id","local_day") WHERE "checkins"."is_skip" = true;--> statement-breakpoint
CREATE INDEX "events_log_user_idx" ON "events_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_log_type_idx" ON "events_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "exports_user_requested_idx" ON "exports" USING btree ("user_id","requested_at");--> statement-breakpoint
CREATE INDEX "freeze_tokens_user_idx" ON "freeze_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "freeze_tokens_status_idx" ON "freeze_tokens" USING btree ("status");--> statement-breakpoint
CREATE INDEX "habit_analytics_daily_habit_idx" ON "habit_analytics_daily" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "habit_custom_rules_habit_idx" ON "habit_custom_rules" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "habits_user_idx" ON "habits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_type_idx" ON "jobs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "streaks_cache_user_idx" ON "streaks_cache" USING btree ("user_id");