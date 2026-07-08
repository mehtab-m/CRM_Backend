import { decimal, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { orderStatusEnum } from './enums.js';
import { businesses } from './businesses.js';
import { customers } from './customers.js';
import { products } from './products.js';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  status: orderStatusEnum('status').notNull().default('new'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  // productId is nullable — product may be deleted after order was placed
  productId: uuid('product_id').references(() => products.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  qty: integer('qty').notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
});

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
