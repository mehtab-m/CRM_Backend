CREATE TYPE "public"."conversation_mode" AS ENUM('auto', 'manual', 'assist');--> statement-breakpoint
CREATE TABLE "processed_message_ids" (
	"message_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "ai_instructions" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "ai_auto_reply_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "mode" "conversation_mode" DEFAULT 'auto' NOT NULL;