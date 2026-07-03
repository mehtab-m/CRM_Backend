import type { UserRole } from '../db/schema.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sub: string;
        email: string;
        role: UserRole;
        businessId: string | null;
      };
    }
  }
}

export {};
