import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAutomationSecret } from '../../middleware/automationAuth.middleware.js';
import {
  getBusinessByPhone,
  getProducts,
  postDedupe,
  postFindOrCreateConversation,
  postFindOrCreateCustomer,
  postMessage,
  postOrder,
} from './automation.controller.js';

// Generous limit: one legitimate WhatsApp webhook delivery fans out into
// several calls here (dedupe, lookup, find-or-create x2, message, maybe order).
const automationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const automationRouter = Router();

automationRouter.use(automationLimiter);
automationRouter.use(requireAutomationSecret);

automationRouter.get('/business-by-phone/:phoneNumberId', getBusinessByPhone);
automationRouter.get('/products', getProducts);
automationRouter.post('/customers/find-or-create', postFindOrCreateCustomer);
automationRouter.post('/conversations/find-or-create', postFindOrCreateConversation);
automationRouter.post('/messages', postMessage);
automationRouter.post('/orders', postOrder);
automationRouter.post('/dedupe', postDedupe);
