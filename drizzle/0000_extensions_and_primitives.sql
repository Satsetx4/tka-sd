-- The reviewed identity schema uses citext for user email addresses.
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('IMAGE', 'ILLUSTRATION', 'DIAGRAM', 'GRAPH');--> statement-breakpoint
CREATE TYPE "public"."cognitive_level" AS ENUM('UNDERSTAND', 'APPLY', 'REASON');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'IN_REVIEW', 'VERIFIED', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('EASY', 'MEDIUM', 'HARD');--> statement-breakpoint
CREATE TYPE "public"."lesson_block_type" AS ENUM('INTRO', 'OBJECTIVE', 'CONTENT', 'EXAMPLE', 'TIP', 'CHECKPOINT', 'SUMMARY', 'CTA');--> statement-breakpoint
CREATE TYPE "public"."lesson_progress_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."practice_session_status" AS ENUM('ACTIVE', 'COMPLETED', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('SINGLE_CHOICE', 'MULTI_SELECT', 'CATEGORY');--> statement-breakpoint
CREATE TYPE "public"."season_status" AS ENUM('UPCOMING', 'ACTIVE', 'ENDED');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('OFFICIAL_REFERENCE', 'THIRD_PARTY_REFERENCE', 'ORIGINAL', 'REGENERATED');--> statement-breakpoint
CREATE TYPE "public"."stimulus_type" AS ENUM('TEXT', 'IMAGE', 'TABLE', 'GRAPH', 'MIXED');--> statement-breakpoint
CREATE TYPE "public"."text_type" AS ENUM('INFORMATION', 'FICTION');--> statement-breakpoint
CREATE TYPE "public"."tryout_attempt_status" AS ENUM('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'INVALIDATED');--> statement-breakpoint
CREATE TYPE "public"."usage_type" AS ENUM('PRACTICE', 'ASSESSMENT', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('PARENT', 'ADMIN');
