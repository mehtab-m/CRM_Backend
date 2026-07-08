import { and, count, eq, sql } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db } from '../../db/client.js';
import { customers, orders } from '../../db/schema/index.js';
import type { Customer, CustomerTier } from '../../db/schema/index.js';

export interface CustomerDto {
  id: string;
  businessId: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  city?: string;
  tier: CustomerTier;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAnalyticsDto {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  totalOrders: number;
}

export interface CreateCustomerInput {
  name: string;
  phoneNumber: string;
  email?: string;
  city?: string;
  tier?: CustomerTier;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

function toCustomerDto(c: Customer, orderCount = 0, totalSpent = 0): CustomerDto {
  return {
    id: c.id,
    businessId: c.businessId,
    phoneNumber: c.phoneNumber,
    name: c.name ?? undefined,
    email: c.email ?? undefined,
    city: c.city ?? undefined,
    tier: c.tier,
    orderCount,
    totalSpent,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export class CustomersService {
  private assertBusinessId(businessId: string | null): string {
    if (!businessId) throw new AppError(403, 'Business account required');
    return businessId;
  }

  async list(businessId: string | null): Promise<CustomerDto[]> {
    const bid = this.assertBusinessId(businessId);
    // Left join orders to compute per-customer order count + total spent.
    const rows = await db
      .select({
        customer: customers,
        orderCount: sql<number>`count(${orders.id})`,
        totalSpent: sql<number>`coalesce(sum(${orders.totalAmount}::numeric), 0)`,
      })
      .from(customers)
      .leftJoin(orders, eq(orders.customerId, customers.id))
      .where(eq(customers.businessId, bid))
      .groupBy(customers.id)
      .orderBy(customers.createdAt);

    return rows.map((r) => toCustomerDto(r.customer, Number(r.orderCount), Number(r.totalSpent)));
  }

  async getOne(businessId: string | null, customerId: string): Promise<CustomerDto> {
    const bid = this.assertBusinessId(businessId);
    const [row] = await db
      .select({
        customer: customers,
        orderCount: sql<number>`count(${orders.id})`,
        totalSpent: sql<number>`coalesce(sum(${orders.totalAmount}::numeric), 0)`,
      })
      .from(customers)
      .leftJoin(orders, eq(orders.customerId, customers.id))
      .where(and(eq(customers.id, customerId), eq(customers.businessId, bid)))
      .groupBy(customers.id)
      .limit(1);
    if (!row) throw new AppError(404, 'Customer not found');
    return toCustomerDto(row.customer, Number(row.orderCount), Number(row.totalSpent));
  }

  async create(businessId: string | null, input: CreateCustomerInput): Promise<CustomerDto> {
    const bid = this.assertBusinessId(businessId);
    const [row] = await db
      .insert(customers)
      .values({
        businessId: bid,
        phoneNumber: input.phoneNumber,
        name: input.name,
        email: input.email ?? null,
        city: input.city ?? null,
        tier: input.tier ?? 'new',
      })
      .returning();
    return toCustomerDto(row);
  }

  async update(
    businessId: string | null,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<CustomerDto> {
    const bid = this.assertBusinessId(businessId);
    const [existing] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.businessId, bid)))
      .limit(1);
    if (!existing) throw new AppError(404, 'Customer not found');

    await db
      .update(customers)
      .set({
        phoneNumber: input.phoneNumber ?? existing.phoneNumber,
        name: input.name ?? existing.name,
        email: input.email !== undefined ? input.email || null : existing.email,
        city: input.city !== undefined ? input.city || null : existing.city,
        tier: input.tier ?? existing.tier,
      })
      .where(eq(customers.id, customerId));

    return this.getOne(bid, customerId);
  }

  async analytics(businessId: string | null): Promise<CustomerAnalyticsDto> {
    const bid = this.assertBusinessId(businessId);

    const [customerCount] = await db
      .select({ total: count() })
      .from(customers)
      .where(eq(customers.businessId, bid));

    const [orderStats] = await db
      .select({
        totalOrders: count(),
        totalRevenue: sql<number>`coalesce(sum(${orders.totalAmount}::numeric), 0)`,
      })
      .from(orders)
      .where(eq(orders.businessId, bid));

    // Active = customers who have at least one order
    const [activeCount] = await db
      .select({ active: sql<number>`count(distinct ${orders.customerId})` })
      .from(orders)
      .where(eq(orders.businessId, bid));

    return {
      totalCustomers: customerCount?.total ?? 0,
      activeCustomers: Number(activeCount?.active ?? 0),
      totalRevenue: Number(orderStats?.totalRevenue ?? 0),
      totalOrders: orderStats?.totalOrders ?? 0,
    };
  }
}

export const customersService = new CustomersService();
