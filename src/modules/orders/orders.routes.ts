import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { getOrder, getOrders, patchOrderStatus, postOrder } from './orders.controller.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.use(requireRole('crm_owner', 'business_owner', 'business_employee'));

ordersRouter.get('/', getOrders);
ordersRouter.post('/', postOrder);
ordersRouter.get('/:id', getOrder);
ordersRouter.patch('/:id/status', patchOrderStatus);
