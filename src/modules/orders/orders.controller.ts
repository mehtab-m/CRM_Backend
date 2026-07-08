import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { ordersService } from './orders.service.js';
import { orderStatuses } from '../../db/schema/index.js';

const orderIdSchema = z.object({ id: z.string().uuid() });
const updateStatusSchema = z.object({ status: z.enum(orderStatuses) });

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request' });
}

export async function getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const result = await ordersService.list(req.auth.businessId, status);
    res.json({ orders: result });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { id } = orderIdSchema.parse(req.params);
    const result = await ordersService.getOne(req.auth.businessId, id);
    res.json({ order: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function patchOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { id } = orderIdSchema.parse(req.params);
    const { status } = updateStatusSchema.parse(req.body);
    const result = await ordersService.updateStatus(req.auth.businessId, id, status);
    res.json({ order: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}
