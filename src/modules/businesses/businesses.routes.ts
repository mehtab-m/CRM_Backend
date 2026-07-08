import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { getAllBusinesses, getBusinessSettings, patchBusinessSettings } from './businesses.controller.js';

export const businessesRouter = Router();

businessesRouter.use(requireAuth);

// CRM_Owner can list all businesses
businessesRouter.get('/', requireRole('crm_owner'), getAllBusinesses);

// business_owner and crm_owner can view/update settings
businessesRouter.get('/settings', requireRole('crm_owner', 'business_owner'), getBusinessSettings);
businessesRouter.patch('/settings', requireRole('crm_owner', 'business_owner'), patchBusinessSettings);
