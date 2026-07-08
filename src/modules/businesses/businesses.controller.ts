import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { businessesService } from './businesses.service.js';

const updateBusinessSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappAccessToken: z.string().optional(),
  whatsappBusinessAccountId: z.string().optional(),
  notifyEmail: z.union([z.string().email(), z.literal('')]).optional(),
});

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request' });
}

export async function getBusinessSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await businessesService.getSettings(req.auth.businessId);
    res.json({ business: result });
  } catch (error) {
    next(error);
  }
}

export async function patchBusinessSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const body = updateBusinessSchema.parse(req.body);
    const result = await businessesService.updateSettings(req.auth.businessId, body);
    res.json({ business: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function getAllBusinesses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await businessesService.listAll();
    res.json({ businesses: result });
  } catch (error) {
    next(error);
  }
}
