CREATE TABLE "practice_answers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"practice_session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"response_json" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"score_fraction" numeric(5, 4) NOT NULL,
	"answered_at" timestamp with time zone NOT NULL,
	"response_time_ms" integer,
	CONSTRAINT "practice_answers_session_question_unique" UNIQUE("practice_session_id","question_id"),
	CONSTRAINT "practice_answers_score_fraction_range_check" CHECK ("practice_answers"."score_fraction" >= 0 AND "practice_answers"."score_fraction" <= 1)
);
--> statement-breakpoint
CREATE TABLE "practice_session_items" (
	"practice_session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "practice_session_items_practice_session_id_question_id_pk" PRIMARY KEY("practice_session_id","question_id"),
	CONSTRAINT "practice_session_items_session_position_unique" UNIQUE("practice_session_id","position")
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"child_profile_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"topic_id" uuid,
	"status" "practice_session_status" NOT NULL,
	"question_target" integer NOT NULL,
	"questions_answered" integer NOT NULL,
	"correct_count" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_practice_session_id_practice_sessions_id_fk" FOREIGN KEY ("practice_session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_practice_session_id_practice_sessions_id_fk" FOREIGN KEY ("practice_session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_child_profile_id_child_profiles_id_fk" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_sessions_child_profile_id_started_at_idx" ON "practice_sessions" USING btree ("child_profile_id","started_at" DESC NULLS LAST);