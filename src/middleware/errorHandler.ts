import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../common/AppError.js';

function isTimeoutError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND') return true;
  // DrizzleQueryError wraps the original pg error in `cause`
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === 'object' && cause !== null) {
    const causeCode = (cause as { code?: unknown }).code;
    if (causeCode === 'ETIMEDOUT' || causeCode === 'ECONNREFUSED') return true;
  }
  return false;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (isTimeoutError(err)) {
    res.status(503).json({ message: 'Database is waking up, please try again in a moment.' });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
