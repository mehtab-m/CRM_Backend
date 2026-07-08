import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { conversationsService } from './conversations.service.js';
import { conversationStatuses } from '../../db/schema/index.js';

const conversationIdSchema = z.object({ id: z.string().uuid() });
const sendMessageSchema = z.object({ content: z.string().min(1) });
const createConversationSchema = z.object({ customerId: z.string().uuid() });
const updateStatusSchema = z.object({ status: z.enum(conversationStatuses) });

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request' });
}

export async function getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const result = await conversationsService.list(req.auth.businessId);
    res.json({ conversations: result });
  } catch (error) {
    next(error);
  }
}

export async function postConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { customerId } = createConversationSchema.parse(req.body);
    const result = await conversationsService.getOrCreate(req.auth.businessId, customerId);
    res.status(201).json({ conversation: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { id } = conversationIdSchema.parse(req.params);
    const result = await conversationsService.getMessages(req.auth.businessId, id);
    res.json({ messages: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function postMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { id } = conversationIdSchema.parse(req.params);
    const { content } = sendMessageSchema.parse(req.body);
    const result = await conversationsService.sendMessage(req.auth.businessId, id, content);
    res.status(201).json({ message: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function patchConversationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { id } = conversationIdSchema.parse(req.params);
    const result = await conversationsService.markRead(req.auth.businessId, id);
    res.json({ conversation: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}

export async function patchConversationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError(401, 'Unauthorized');
    const { id } = conversationIdSchema.parse(req.params);
    const { status } = updateStatusSchema.parse(req.body);
    const result = await conversationsService.updateStatus(req.auth.businessId, id, status);
    res.json({ conversation: result });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error, res);
      return;
    }
    next(error);
  }
}
