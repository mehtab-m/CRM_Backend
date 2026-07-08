import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { customerTierEnum } from './enums.js';
import { businesses } from './businesses.js';

// Customers are WhatsApp contacts that interact with a business.
// They never log into the product — they exist purely as chat participants.
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  phoneNumber: varchar('phone_number', { length: 30 }).notNull(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  city: varchar('city', { length: 120 }),
  tier: customerTierEnum('tier').notNull().default('new'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Customer = typeof customers.$inferSelect;
