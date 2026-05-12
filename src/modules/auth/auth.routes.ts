import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { getMe, postLogin, postLogout, postRegister } from './auth.controller.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.post('/login', strictAuthLimiter, postLogin);
authRouter.post('/register', strictAuthLimiter, postRegister);
authRouter.get('/me', authLimiter, requireAuth, getMe);
authRouter.post('/logout', postLogout);
