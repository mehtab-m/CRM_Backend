import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { getConversations, getMessages, postMessage } from './conversations.controller.js';

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);
conversationsRouter.use(requireRole('crm_owner', 'business_owner', 'business_employee'));

conversationsRouter.get('/', getConversations);
conversationsRouter.get('/:id/messages', getMessages);
conversationsRouter.post('/:id/messages', postMessage);
