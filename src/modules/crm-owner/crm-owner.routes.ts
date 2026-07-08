import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import {
  deleteOwnerAccount,
  getBusinessOverviews,
  getOwnerAccounts,
  getPlatformStats,
  postOwnerAccount,
} from './crm-owner.controller.js';

export const crmOwnerRouter = Router();

crmOwnerRouter.use(requireAuth);
crmOwnerRouter.use(requireRole('crm_owner'));

// Dashboard
crmOwnerRouter.get('/stats', getPlatformStats);
crmOwnerRouter.get('/businesses', getBusinessOverviews);

// Owner account management (up to 3 additional = 4 total)
crmOwnerRouter.get('/owners', getOwnerAccounts);
crmOwnerRouter.post('/owners', postOwnerAccount);
crmOwnerRouter.delete('/owners/:id', deleteOwnerAccount);
