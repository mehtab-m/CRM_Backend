import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { categoriesService } from './categories.service.js';

const createCategorySchema = z.object({ name: z.string().min(1).max(100) });

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request' });
}

export async function getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await categoriesService.list(req.auth.businessId);
    res.json({ categories: result });
  } catch (error) {
    next(error);
  }
}

export async function postCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { name } = createCategorySchema.parse(req.body);
    const result = await categoriesService.create(req.auth.businessId, name);
    res.status(201).json({ category: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}
