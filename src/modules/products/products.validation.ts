import { z } from 'zod';
import { productStatuses } from '../../db/schema.js';

const variantsSchema = z
  .object({
    colors: z.array(z.string().min(1)).optional(),
    sizes: z.array(z.string().min(1)).optional(),
    storage: z.array(z.string().min(1)).optional(),
  })
  .optional();

export const createProductBodySchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  imageUrl: z.union([z.string().url(), z.literal('')]).optional(),
  price: z.number().int().min(0),
  stock: z.number().int().min(0),
  status: z.enum(productStatuses).optional(),
  variants: variantsSchema,
});

export const updateProductBodySchema = createProductBodySchema.partial();

export const productIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
