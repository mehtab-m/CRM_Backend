import type { UserRole } from '../../db/schema.js';

export interface AuthUserDto {
  email: string;
  fullName: string;
  role: UserRole;
  businessName?: string;
  phone?: string;
}

export function toAuthUser(params: {
  email: string;
  fullName: string;
  role: AuthUserDto['role'];
  phone?: string | null;
  businessName?: string | null;
}): AuthUserDto {
  return {
    email: params.email,
    fullName: params.fullName,
    role: params.role,
    phone: params.phone ?? undefined,
    businessName: params.businessName ?? undefined,
  };
}
