import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  whatsappPhoneNumberId: text('whatsapp_phone_number_id'),
  whatsappAccessToken: text('whatsapp_access_token'),
  whatsappBusinessAccountId: text('whatsapp_business_account_id'),
  notifyEmail: varchar('notify_email', { length: 255 }),
  // Free-text instructions folded into the AI agent's system prompt.
  aiInstructions: text('ai_instructions'),
  aiAutoReplyEnabled: boolean('ai_auto_reply_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Business = typeof businesses.$inferSelect;
