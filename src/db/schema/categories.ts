import { pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { businesses } from './businesses.js';

// Product categories per business. Sources the category dropdown in the
// product form. products.category still stores the category name string.
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueBusinessName: unique('categories_business_id_name_unique').on(
      table.businessId,
      table.name,
    ),
  }),
);

export type Category = typeof categories.$inferSelect;
