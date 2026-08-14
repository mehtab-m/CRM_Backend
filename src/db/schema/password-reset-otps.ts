import {integer, pgTable, timestamp, uuid, text,} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const passwordResetOtps = pgTable('password_reset_otps', {
  id: uuid('id').primaryKey().defaultRandom(),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  otpHash: text('otp_hash').notNull(),

  expiresAt: timestamp('expires_at', {
    withTimezone: true,
  }).notNull(),

  attempts: integer('attempts').notNull().default(0),

  verifiedAt: timestamp('verified_at', {
    withTimezone: true,
  }),

  usedAt: timestamp('used_at', {
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;