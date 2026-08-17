import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

// The WhatsApp automation (n8n) has no user session — it authenticates with
// a shared secret instead of a JWT. Business scoping happens per-call via
// an explicit businessId (resolved from the WhatsApp phone_number_id).
export function requireAutomationSecret(req: Request, res: Response, next: NextFunction): void {
  const provided = req.get('X-Automation-Secret');
  if (!provided || provided !== env.AUTOMATION_API_SECRET) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  next();
}
