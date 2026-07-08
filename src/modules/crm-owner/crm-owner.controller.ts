import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { crmOwnerService } from './crm-owner.service.js';

const addOwnerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).max(255),
});

const ownerIdSchema = z.object({ id: z.string().uuid() });

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request' });
}

export async function getPlatformStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await crmOwnerService.getPlatformStats();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getBusinessOverviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await crmOwnerService.getBusinessOverviews();
    res.json({ businesses: result });
  } catch (error) {
    next(error);
  }
}

export async function getOwnerAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await crmOwnerService.listOwnerAccounts();
    res.json({ owners: result });
  } catch (error) {
    next(error);
  }
}

export async function postOwnerAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const body = addOwnerSchema.parse(req.body);
    const result = await crmOwnerService.addOwnerAccount(body);
    res.status(201).json({ owner: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function deleteOwnerAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { id } = ownerIdSchema.parse(req.params);
    await crmOwnerService.removeOwnerAccount(req.auth.sub, id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}
