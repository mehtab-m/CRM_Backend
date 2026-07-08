import { count, eq, sql } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db, isUniqueViolation } from '../../db/client.js';
import { businesses, customers, orders, users } from '../../db/schema/index.js';
import { hashPassword } from '../../lib/password.js';

export interface PlatformStatsDto {
  totalBusinesses: number;
  totalUsers: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface BusinessOverviewDto {
  id: string;
  name: string;
  userCount: number;
  customerCount: number;
  orderCount: number;
  revenue: number;
  createdAt: string;
}

export interface OwnerAccountDto {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
}

export class CrmOwnerService {
  async getPlatformStats(): Promise<PlatformStatsDto> {
    const [bizCount] = await db.select({ total: count() }).from(businesses);
    const [userCount] = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.role, 'business_owner'));
    const [custCount] = await db.select({ total: count() }).from(customers);
    const [orderStats] = await db.select({
      total: count(),
      revenue: sql<number>`coalesce(sum(${orders.totalAmount}::numeric), 0)`,
    }).from(orders);

    return {
      totalBusinesses: bizCount?.total ?? 0,
      totalUsers: userCount?.total ?? 0,
      totalCustomers: custCount?.total ?? 0,
      totalOrders: orderStats?.total ?? 0,
      totalRevenue: Number(orderStats?.revenue ?? 0),
    };
  }

  async getBusinessOverviews(): Promise<BusinessOverviewDto[]> {
    const allBusinesses = await db.select().from(businesses).orderBy(businesses.createdAt);

    const overviews: BusinessOverviewDto[] = await Promise.all(
      allBusinesses.map(async (biz) => {
        const [uc] = await db
          .select({ total: count() })
          .from(users)
          .where(eq(users.businessId, biz.id));
        const [cc] = await db
          .select({ total: count() })
          .from(customers)
          .where(eq(customers.businessId, biz.id));
        const [os] = await db
          .select({
            total: count(),
            revenue: sql<number>`coalesce(sum(${orders.totalAmount}::numeric), 0)`,
          })
          .from(orders)
          .where(eq(orders.businessId, biz.id));

        return {
          id: biz.id,
          name: biz.name,
          userCount: uc?.total ?? 0,
          customerCount: cc?.total ?? 0,
          orderCount: os?.total ?? 0,
          revenue: Number(os?.revenue ?? 0),
          createdAt: biz.createdAt.toISOString(),
        };
      })
    );

    return overviews;
  }

  async listOwnerAccounts(): Promise<OwnerAccountDto[]> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.role, 'crm_owner'))
      .orderBy(users.createdAt);

    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async addOwnerAccount(body: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<OwnerAccountDto> {
    // Max 3 additional owners (4 total including default)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'crm_owner'));

    if (existing.length >= 4) {
      throw new AppError(400, 'Maximum of 4 CRM_Owner accounts allowed');
    }

    const passwordHash = await hashPassword(body.password);

    try {
      const [row] = await db
        .insert(users)
        .values({
          email: body.email.toLowerCase().trim(),
          passwordHash,
          fullName: body.fullName,
          role: 'crm_owner',
          businessId: null,
          isActive: true,
        })
        .returning();

      return {
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        isActive: row.isActive,
        createdAt: row.createdAt.toISOString(),
      };
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppError(409, 'Email already registered');
      throw err;
    }
  }

  async removeOwnerAccount(requesterId: string, targetId: string): Promise<void> {
    if (requesterId === targetId) {
      throw new AppError(400, 'Cannot remove your own account');
    }

    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);

    if (!target || target.role !== 'crm_owner') {
      throw new AppError(404, 'Owner account not found');
    }

    await db.delete(users).where(eq(users.id, targetId));
  }
}

export const crmOwnerService = new CrmOwnerService();
