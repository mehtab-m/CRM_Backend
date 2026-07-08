import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../common/AppError.js';
import { productsService } from './products.service.js';
import {
  createProductBodySchema,
  productIdParamSchema,
  updateProductBodySchema,
} from './products.validation.js';

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request body' });
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError(401, 'Unauthorized');
    }
    const result = await productsService.list(req.auth.businessId);
    res.json({ products: result });
  } catch (error) {
    next(error);
  }
}

export async function postProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError(401, 'Unauthorized');
    }
    const body = createProductBodySchema.parse(req.body);
    const result = await productsService.create(req.auth.businessId, body);
    res.status(201).json({ product: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function patchProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError(401, 'Unauthorized');
    }
    const { id } = productIdParamSchema.parse(req.params);
    const body = updateProductBodySchema.parse(req.body);
    const result = await productsService.update(req.auth.businessId, id, body);
    res.json({ product: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError(401, 'Unauthorized');
    }
    const { id } = productIdParamSchema.parse(req.params);
    await productsService.remove(req.auth.businessId, id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}
