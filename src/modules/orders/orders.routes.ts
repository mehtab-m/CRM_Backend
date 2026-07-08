import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { getOrder, getOrders, patchOrderStatus } from './orders.controller.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.use(requireRole('crm_owner', 'business_owner', 'business_employee'));

ordersRouter.get('/', getOrders);
ordersRouter.get('/:id', getOrder);
ordersRouter.patch('/:id/status', patchOrderStatus);
