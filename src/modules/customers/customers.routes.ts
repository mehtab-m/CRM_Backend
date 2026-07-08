import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import {
  getCustomer,
  getCustomers,
  getCustomersAnalytics,
  patchCustomer,
  postCustomer,
} from './customers.controller.js';

export const customersRouter = Router();

customersRouter.use(requireAuth);
customersRouter.use(requireRole('crm_owner', 'business_owner', 'business_employee'));

customersRouter.get('/', getCustomers);
customersRouter.post('/', postCustomer);
customersRouter.get('/analytics', getCustomersAnalytics);
customersRouter.get('/:id', getCustomer);
customersRouter.patch('/:id', patchCustomer);
