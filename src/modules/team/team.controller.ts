import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { teamService } from './team.service.js';

const createTeamMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).max(255),
  phone: z.string().max(30).optional(),
});

const memberIdSchema = z.object({ id: z.string().uuid() });

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request' });
}

export async function getTeamMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await teamService.list(req.auth.businessId);
    res.json({ members: result });
  } catch (error) {
    next(error);
  }
}

export async function postTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const body = createTeamMemberSchema.parse(req.body);
    const result = await teamService.create(req.auth.businessId, body);
    res.status(201).json({ member: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function deleteTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { id } = memberIdSchema.parse(req.params);
    await teamService.remove(req.auth.businessId, id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}
