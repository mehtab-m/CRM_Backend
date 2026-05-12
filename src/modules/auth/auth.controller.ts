import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../common/AppError.js';
import { authService } from './auth.service.js';
import { loginBodySchema, registerBodySchema } from './auth.validation.js';

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request body' });
}

export async function postLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginBodySchema.parse(req.body);
    const result = await authService.login(body);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function postRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = registerBodySchema.parse(req.body);
    const result = await authService.register(body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      throw new AppError(401, 'Unauthorized');
    }
    const result = await authService.getMe(req.auth.sub);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export function postLogout(_req: Request, res: Response): void {
  res.status(204).send();
}
