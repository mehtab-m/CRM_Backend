import { and, desc, eq, sql } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db } from '../../db/client.js';
import { customers, orderItems, orders, orderStatuses } from '../../db/schema/index.js';
import type { Customer, Order, OrderItem } from '../../db/schema/index.js';

export interface OrderItemInput {
  productId?: string;
  productName: string;
  qty: number;
  price: number;
}

export interface CreateOrderInput {
  customerId: string;
  items: OrderItemInput[];
  deliveryAddress?: string;
  city?: string;
  status?: (typeof orderStatuses)[number];
}

export interface OrderItemDto {
  id: string;
  productId?: string;
  productName: string;
  qty: number;
  price: number;
}

export interface OrderDto {
  id: string;
  businessId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  status: 'new' | 'confirmed' | 'dispatched' | 'delivered';
  totalAmount: number;
  deliveryAddress?: string;
  city?: string;
  product?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItemDto[];
}

function summarizeItems(items: OrderItem[]): string {
  return items.map((i) => (i.qty > 1 ? `${i.productName} x${i.qty}` : i.productName)).join(', ');
}

function toOrderItemDto(i: OrderItem): OrderItemDto {
  return {
    id: i.id,
    productId: i.productId ?? undefined,
    productName: i.productName,
    qty: i.qty,
    price: Number(i.price),
  };
}

function toOrderDto(
  o: Order,
  customer?: Customer | null,
  items?: OrderItem[],
  productSummary?: string | null,
): OrderDto {
  const product = items && items.length ? summarizeItems(items) : productSummary ?? undefined;
  return {
    id: o.id,
    businessId: o.businessId,
    customerId: o.customerId,
    customerName: customer?.name ?? undefined,
    customerPhone: customer?.phoneNumber ?? undefined,
    status: o.status,
    totalAmount: Number(o.totalAmount),
    deliveryAddress: o.deliveryAddress ?? undefined,
    city: o.city ?? undefined,
    product,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: items ? items.map(toOrderItemDto) : undefined,
  };
}

export class OrdersService {
  private assertBusinessId(businessId: string | null): string {
    if (!businessId) throw new AppError(403, 'Business account required');
    return businessId;
  }

  async list(businessId: string | null, status?: string): Promise<OrderDto[]> {
    const bid = this.assertBusinessId(businessId);

    const conditions = [eq(orders.businessId, bid)];
    if (status && orderStatuses.includes(status as (typeof orderStatuses)[number])) {
      conditions.push(eq(orders.status, status as (typeof orderStatuses)[number]));
    }

    const rows = await db
      .select({
        order: orders,
        customer: customers,
        productSummary: sql<string | null>`(
          select string_agg(${orderItems.productName}, ', ')
          from ${orderItems}
          where ${orderItems.orderId} = ${orders.id}
        )`,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    return rows.map((r) => toOrderDto(r.order, r.customer, undefined, r.productSummary));
  }

  async getOne(businessId: string | null, orderId: string): Promise<OrderDto> {
    const bid = this.assertBusinessId(businessId);

    const [row] = await db
      .select({ order: orders, customer: customers })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(orders.id, orderId), eq(orders.businessId, bid)))
      .limit(1);

    if (!row) throw new AppError(404, 'Order not found');

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return toOrderDto(row.order, row.customer, items);
  }

  async create(businessId: string | null, input: CreateOrderInput): Promise<OrderDto> {
    const bid = this.assertBusinessId(businessId);

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, input.customerId), eq(customers.businessId, bid)))
      .limit(1);
    if (!customer) throw new AppError(404, 'Customer not found');

    if (!input.items.length) throw new AppError(400, 'At least one order item is required');

    const totalAmount = input.items.reduce((sum, item) => sum + item.qty * item.price, 0);

    const [order] = await db
      .insert(orders)
      .values({
        businessId: bid,
        customerId: input.customerId,
        status: input.status ?? 'new',
        totalAmount: totalAmount.toFixed(2),
        deliveryAddress: input.deliveryAddress ?? null,
        city: input.city ?? null,
      })
      .returning();

    const insertedItems = await db
      .insert(orderItems)
      .values(
        input.items.map((item) => ({
          orderId: order.id,
          productId: item.productId ?? null,
          productName: item.productName,
          qty: item.qty,
          price: item.price.toFixed(2),
        })),
      )
      .returning();

    return toOrderDto(order, customer, insertedItems);
  }

  async updateStatus(
    businessId: string | null,
    orderId: string,
    status: (typeof orderStatuses)[number],
  ): Promise<OrderDto> {
    const bid = this.assertBusinessId(businessId);

    const [existing] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.businessId, bid)))
      .limit(1);

    if (!existing) throw new AppError(404, 'Order not found');

    const [updated] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, orderId))
      .returning();

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, updated.customerId))
      .limit(1);

    return toOrderDto(updated, customer);
  }
}

export const ordersService = new OrdersService();
