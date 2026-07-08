import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { deleteProduct, getProducts, patchProduct, postProduct } from './products.controller.js';

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get('/', getProducts);
productsRouter.post('/', postProduct);
productsRouter.patch('/:id', patchProduct);
productsRouter.delete('/:id', deleteProduct);
