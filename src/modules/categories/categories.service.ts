import { and, eq } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db, isUniqueViolation } from '../../db/client.js';
import { categories } from '../../db/schema/index.js';
import type { Category } from '../../db/schema/index.js';

export interface CategoryDto {
  id: string;
  name: string;
  createdAt: string;
}

function toCategoryDto(c: Category): CategoryDto {
  return {
    id: c.id,
    name: c.name,
    createdAt: c.createdAt.toISOString(),
  };
}

export class CategoriesService {
  private assertBusinessId(businessId: string | null): string {
    if (!businessId) throw new AppError(403, 'Business account required');
    return businessId;
  }

  async list(businessId: string | null): Promise<CategoryDto[]> {
    const bid = this.assertBusinessId(businessId);
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.businessId, bid))
      .orderBy(categories.name);
    return rows.map(toCategoryDto);
  }

  // Idempotent per business: returns the existing category if the name is taken.
  async create(businessId: string | null, name: string): Promise<CategoryDto> {
    const bid = this.assertBusinessId(businessId);
    const trimmed = name.trim();
    if (!trimmed) throw new AppError(400, 'Category name is required');

    try {
      const [row] = await db
        .insert(categories)
        .values({ businessId: bid, name: trimmed })
        .returning();
      return toCategoryDto(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        const [existing] = await db
          .select()
          .from(categories)
          .where(and(eq(categories.businessId, bid), eq(categories.name, trimmed)))
          .limit(1);
        if (existing) return toCategoryDto(existing);
      }
      throw err;
    }
  }
}

export const categoriesService = new CategoriesService();
