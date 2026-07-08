import { and, count, eq, sql } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db } from '../../db/client.js';
import { customers, orders } from '../../db/schema/index.js';
import type { Customer } from '../../db/schema/index.js';

export interface CustomerDto {
  id: string;
  businessId: string;
  phoneNumber: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAnalyticsDto {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  totalOrders: number;
}

function toCustomerDto(c: Customer): CustomerDto {
  return {
    id: c.id,
    businessId: c.businessId,
    phoneNumber: c.phoneNumber,
    name: c.name ?? undefined,
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
    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.businessId, bid))
      .orderBy(customers.createdAt);
    return rows.map(toCustomerDto);
  }

  async getOne(businessId: string | null, customerId: string): Promise<CustomerDto> {
    const bid = this.assertBusinessId(businessId);
    const [row] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.businessId, bid)))
      .limit(1);
    if (!row) throw new AppError(404, 'Customer not found');
    return toCustomerDto(row);
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
