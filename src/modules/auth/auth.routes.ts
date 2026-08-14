import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {getMe,postLogin,postLogout,postRegister,postChangePassword,postForgotPassword,postVerifyResetOtp, postResetPassword,} from './auth.controller.js';

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
authRouter.post('/forgot-password', strictAuthLimiter, postForgotPassword);
authRouter.post('/verify-reset-otp', strictAuthLimiter, postVerifyResetOtp);
authRouter.post('/reset-password', strictAuthLimiter, postResetPassword);
authRouter.get('/me', authLimiter, requireAuth, getMe);
authRouter.post('/change-password', authLimiter, requireAuth, postChangePassword);
authRouter.post('/logout', postLogout);

