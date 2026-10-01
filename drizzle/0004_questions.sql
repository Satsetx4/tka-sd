CREATE TABLE "category_answers" (
	"statement_id" uuid NOT NULL,
	"category_choice_id" uuid NOT NULL,
	CONSTRAINT "category_answers_statement_id_category_choice_id_pk" PRIMARY KEY("statement_id","category_choice_id")
);
--> statement-breakpoint
CREATE TABLE "category_choices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "category_choices_question_id_code_unique" UNIQUE("question_id","code")
);
--> statement-breakpoint
CREATE TABLE "category_statements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"statement_body_json" jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "category_statements_question_id_sort_order_unique" UNIQUE("question_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"option_key" text NOT NULL,
	"body_json" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "question_options_question_id_option_key_unique" UNIQUE("question_id","option_key"),
	CONSTRAINT "question_options_question_id_sort_order_unique" UNIQUE("question_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "question_tags" (
	"question_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "question_tags_question_id_tag_id_pk" PRIMARY KEY("question_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"primary_competency_id" uuid NOT NULL,
	"primary_indicator_id" uuid,
	"stimulus_id" uuid,
	"question_type" "question_type" NOT NULL,
	"cognitive_level" "cognitive_level" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"usage_type" "usage_type" NOT NULL,
	"question_body_json" jsonb NOT NULL,
	"explanation_body_json" jsonb NOT NULL,
	"status" "content_status" NOT NULL,
	"version" integer NOT NULL,
	"source_type" "source_type" NOT NULL,
	"source_reference" text,
	"created_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "questions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "category_answers" ADD CONSTRAINT "category_answers_statement_id_category_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."category_statements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_answers" ADD CONSTRAINT "category_answers_category_choice_id_category_choices_id_fk" FOREIGN KEY ("category_choice_id") REFERENCES "public"."category_choices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_choices" ADD CONSTRAINT "category_choices_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_statements" ADD CONSTRAINT "category_statements_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_primary_competency_id_competencies_id_fk" FOREIGN KEY ("primary_competency_id") REFERENCES "public"."competencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_primary_indicator_id_indicators_id_fk" FOREIGN KEY ("primary_indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_stimulus_id_stimuli_id_fk" FOREIGN KEY ("stimulus_id") REFERENCES "public"."stimuli"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questions_subject_id_topic_id_status_idx" ON "questions" USING btree ("subject_id","topic_id","status");--> statement-breakpoint
CREATE INDEX "questions_status_usage_type_idx" ON "questions" USING btree ("status","usage_type");--> statement-breakpoint
CREATE INDEX "questions_primary_competency_id_status_idx" ON "questions" USING btree ("primary_competency_id","status");--> statement-breakpoint
CREATE INDEX "questions_stimulus_id_idx" ON "questions" USING btree ("stimulus_id");