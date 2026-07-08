import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { senderTypeEnum } from './enums.js';
import { businesses } from './businesses.js';
import { customers } from './customers.js';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// senderType 'agent' = the AI agent (WhatsApp bot), not a product user role.
// 'customer' = the WhatsApp contact. 'ai' = future LLM-generated replies.
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderType: senderTypeEnum('sender_type').notNull(),
  content: text('content').notNull(),
  isCustomReply: boolean('is_custom_reply').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
