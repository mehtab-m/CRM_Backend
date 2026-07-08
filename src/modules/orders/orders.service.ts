import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { db } from '../../db/client.js';
import { orderItems, orders, orderStatuses } from '../../db/schema/index.js';
import type { Order, OrderItem } from '../../db/schema/index.js';

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
  status: 'new' | 'confirmed' | 'dispatched' | 'delivered';
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items?: OrderItemDto[];
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

function toOrderDto(o: Order, items?: OrderItem[]): OrderDto {
  return {
    id: o.id,
    businessId: o.businessId,
    customerId: o.customerId,
    status: o.status,
    totalAmount: Number(o.totalAmount),
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
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(orders.createdAt);

    return rows.map((o) => toOrderDto(o));
  }

  async getOne(businessId: string | null, orderId: string): Promise<OrderDto> {
    const bid = this.assertBusinessId(businessId);

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.businessId, bid)))
      .limit(1);

    if (!order) throw new AppError(404, 'Order not found');

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return toOrderDto(order, items);
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

    return toOrderDto(updated);
  }
}

export const ordersService = new OrdersService();
