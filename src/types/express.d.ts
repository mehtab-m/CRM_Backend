import type { UserRole } from '../db/schema/index.js';

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
