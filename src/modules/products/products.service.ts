import { and, eq } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db } from '../../db/client.js';
import { products } from '../../db/schema/index.js';
import { toProductDto, type ProductDto } from './products.mapper.js';
import type { CreateProductBody, UpdateProductBody } from './products.validation.js';

function resolveStatus(stock: number, status?: 'active' | 'out_of_stock'): 'active' | 'out_of_stock' {
  if (status) return status;
  return stock > 0 ? 'active' : 'out_of_stock';
}

export class ProductsService {
  private assertBusinessId(businessId: string | null): string {
    if (!businessId) {
      throw new AppError(403, 'Business account required');
    }
    return businessId;
  }

  async list(businessId: string | null): Promise<ProductDto[]> {
    const scopedBusinessId = this.assertBusinessId(businessId);
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.businessId, scopedBusinessId))
      .orderBy(products.createdAt);

    return rows.map(toProductDto);
  }

  async create(businessId: string | null, body: CreateProductBody): Promise<ProductDto> {
    const scopedBusinessId = this.assertBusinessId(businessId);
    const stock = body.stock ?? 0;
    const status = resolveStatus(stock, body.status);

    const [row] = await db
      .insert(products)
      .values({
        businessId: scopedBusinessId,
        name: body.name,
        category: body.category,
        description: body.description ?? null,
        imageUrl: body.imageUrl || null,
        price: body.price,
        stock,
        status,
        variants: body.variants ?? null,
      })
      .returning();

    return toProductDto(row);
  }

  async update(
    businessId: string | null,
    productId: string,
    body: UpdateProductBody,
  ): Promise<ProductDto> {
    const scopedBusinessId = this.assertBusinessId(businessId);

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.businessId, scopedBusinessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, 'Product not found');
    }

    const stock = body.stock ?? existing.stock;
    const status = body.status ?? resolveStatus(stock, undefined);

    const [row] = await db
      .update(products)
      .set({
        name: body.name ?? existing.name,
        category: body.category ?? existing.category,
        description: body.description !== undefined ? body.description ?? null : existing.description,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl || null : existing.imageUrl,
        price: body.price ?? existing.price,
        stock,
        status,
        variants: body.variants !== undefined ? body.variants ?? null : existing.variants,
      })
      .where(eq(products.id, productId))
      .returning();

    return toProductDto(row);
  }

  async remove(businessId: string | null, productId: string): Promise<void> {
    const scopedBusinessId = this.assertBusinessId(businessId);

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.businessId, scopedBusinessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, 'Product not found');
    }

    await db.delete(products).where(eq(products.id, productId));
  }
}

export const productsService = new ProductsService();
