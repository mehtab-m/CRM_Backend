import type { UserRole } from '../db/schema/index.js';
import { AppError } from '../common/AppError.js';

export interface PermissionContext {
  userRole: UserRole;
  userBusinessId?: string | null;
  targetBusinessId?: string;
}

export function checkPermission(
  context: PermissionContext,
  requiredPermissions: {
    allowRoles: UserRole[];
    requireSameBusiness?: boolean;
  }
): void {
  const { userRole, userBusinessId, targetBusinessId } = context;
  const { allowRoles, requireSameBusiness = false } = requiredPermissions;

  if (!allowRoles.includes(userRole)) {
    throw new AppError(403, 'Insufficient permissions');
  }

  // crm_owner bypasses all business scoping
  if (userRole === 'crm_owner') return;

  if (requireSameBusiness && targetBusinessId) {
    if (!userBusinessId || userBusinessId !== targetBusinessId) {
      throw new AppError(403, 'Access denied to this business');
    }
  }
}

export function canManageProducts(role: UserRole): boolean {
  return ['business_owner', 'business_employee', 'crm_owner'].includes(role);
}

export function canUpdateOrderStatus(role: UserRole): boolean {
  return ['business_owner', 'business_employee', 'crm_owner'].includes(role);
}

export function canManageTeam(role: UserRole): boolean {
  return ['business_owner', 'crm_owner'].includes(role);
}

export function canAccessAllBusinesses(role: UserRole): boolean {
  return role === 'crm_owner';
}
