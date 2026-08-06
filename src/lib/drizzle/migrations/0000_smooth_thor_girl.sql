CREATE TABLE "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_type" varchar(20),
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"phone" varchar(20),
	"full_name" text,
	"avatar_url" text,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"upi_id" text,
	"paytm_number" varchar(20),
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_profile_phone" UNIQUE("phone"),
	CONSTRAINT "balance_non_negative" CHECK ("profiles"."points_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"points_awarded" integer NOT NULL,
	"status" varchar(20) DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_submission_task_user" UNIQUE("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"instructions" text,
	"points" integer DEFAULT 0 NOT NULL,
	"category" varchar(60),
	"cover_image_url" text,
	"form_schema" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_points" integer NOT NULL,
	"method" varchar(10) NOT NULL,
	"destination" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ledger_user" ON "points_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_created" ON "points_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_submissions_user" ON "submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_submissions_created" ON "submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_active" ON "tasks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_tasks_created" ON "tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_withdrawals_user" ON "withdrawals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_withdrawals_status" ON "withdrawals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_withdrawals_created" ON "withdrawals" USING btree ("created_at");