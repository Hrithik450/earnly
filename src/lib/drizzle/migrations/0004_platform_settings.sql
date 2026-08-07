CREATE TABLE IF NOT EXISTS "platform_settings" (
	-- Single row. The check constraint is what makes it a singleton: a second
	-- INSERT has nowhere to go, so no code path can create a competing row that
	-- half the app then reads instead.
	"id" integer PRIMARY KEY NOT NULL,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"maintenance_message" text,
	"auto_limit_enabled" boolean DEFAULT false NOT NULL,
	"auto_submission_limit" integer DEFAULT 1000 NOT NULL,
	-- Submissions are counted from here, not from the beginning of time. Lifting
	-- maintenance moves it to now(), otherwise the count would still be over the
	-- limit and the platform would trip straight back into maintenance.
	"counting_since" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_singleton" CHECK ("id" = 1)
);
--> statement-breakpoint

INSERT INTO "platform_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
