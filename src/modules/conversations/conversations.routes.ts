import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import {
  getConversations,
  getMessages,
  patchConversationRead,
  patchConversationStatus,
  postConversation,
  postMessage,
} from './conversations.controller.js';

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);
conversationsRouter.use(requireRole('crm_owner', 'business_owner', 'business_employee'));

conversationsRouter.get('/', getConversations);
conversationsRouter.post('/', postConversation);
conversationsRouter.get('/:id/messages', getMessages);
conversationsRouter.post('/:id/messages', postMessage);
conversationsRouter.patch('/:id/read', patchConversationRead);
conversationsRouter.patch('/:id/status', patchConversationStatus);
