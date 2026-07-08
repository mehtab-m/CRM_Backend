import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { customersService } from './customers.service.js';

const customerIdSchema = z.object({ id: z.string().uuid() });

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request' });
}

export async function getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await customersService.list(req.auth.businessId);
    res.json({ customers: result });
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { id } = customerIdSchema.parse(req.params);
    const result = await customersService.getOne(req.auth.businessId, id);
    res.json({ customer: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function getCustomersAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await customersService.analytics(req.auth.businessId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
