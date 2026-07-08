import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { deleteProduct, getProducts, patchProduct, postProduct } from './products.controller.js';

export const productsRouter = Router();

productsRouter.use(requireAuth);

// crm_owner, business_owner, and business_employee can all manage products
const canManageProducts = requireRole('crm_owner', 'business_owner', 'business_employee');

productsRouter.get('/', getProducts);
productsRouter.post('/', canManageProducts, postProduct);
productsRouter.patch('/:id', canManageProducts, patchProduct);
productsRouter.delete('/:id', requireRole('crm_owner', 'business_owner'), deleteProduct);
