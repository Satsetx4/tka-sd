CREATE TABLE "child_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"grade" smallint NOT NULL,
	"avatar_key" text,
	"status" "profile_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "child_profiles_grade_check" CHECK ("child_profiles"."grade" in (4, 5, 6))
);
--> statement-breakpoint
CREATE TABLE "parent_pins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"pin_hash" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "parent_pins_failed_attempts_check" CHECK ("parent_pins"."failed_attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"auth_provider_user_id" text NOT NULL,
	"email" "citext" NOT NULL,
	"display_name" text NOT NULL,
	"role" "user_role" DEFAULT 'PARENT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_auth_provider_user_id_unique" UNIQUE("auth_provider_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "child_profiles" ADD CONSTRAINT "child_profiles_parent_user_id_users_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_pins" ADD CONSTRAINT "parent_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "child_profiles_parent_user_id_status_idx" ON "child_profiles" USING btree ("parent_user_id","status");