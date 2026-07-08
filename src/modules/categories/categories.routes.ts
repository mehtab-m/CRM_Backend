import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { getCategories, postCategory } from './categories.controller.js';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);
categoriesRouter.use(requireRole('crm_owner', 'business_owner', 'business_employee'));

categoriesRouter.get('/', getCategories);
categoriesRouter.post('/', postCategory);
