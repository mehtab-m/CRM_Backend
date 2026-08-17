import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Idempotency guard for inbound WhatsApp webhook deliveries (Meta retries on
// timeout, so the same message id can arrive more than once).
export const processedMessageIds = pgTable('processed_message_ids', {
  messageId: text('message_id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProcessedMessageId = typeof processedMessageIds.$inferSelect;
