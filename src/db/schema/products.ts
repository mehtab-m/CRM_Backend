import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { productStatusEnum } from './enums.js';
import { businesses } from './businesses.js';

export interface ProductVariants {
  colors?: string[];
  sizes?: string[];
  storage?: string[];
}

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(0),
  status: productStatusEnum('status').notNull().default('active'),
  variants: jsonb('variants').$type<ProductVariants>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Product = typeof products.$inferSelect;
