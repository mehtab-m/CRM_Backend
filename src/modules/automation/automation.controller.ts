import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { automationService } from './automation.service.js';

function handleZodError(error: ZodError, res: Response): void {
  const first = error.issues[0];
  res.status(400).json({ message: first?.message ?? 'Invalid request' });
}

export async function getBusinessByPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phoneNumberId } = z.object({ phoneNumberId: z.string().min(1) }).parse(req.params);
    const business = await automationService.findBusinessByPhoneNumberId(phoneNumberId);
    if (!business) throw new AppError(404, 'No business is connected to this WhatsApp number');
    res.json({ business });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error, res);
    next(error);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { businessId } = z.object({ businessId: z.string().uuid() }).parse(req.query);
    const products = await automationService.listActiveProducts(businessId);
    res.json({ products });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error, res);
    next(error);
  }
}

const findOrCreateCustomerSchema = z.object({
  businessId: z.string().uuid(),
  phoneNumber: z.string().min(1),
  name: z.string().min(1).optional(),
});

export async function postFindOrCreateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = findOrCreateCustomerSchema.parse(req.body);
    const customer = await automationService.findOrCreateCustomer(body.businessId, body.phoneNumber, body.name);
    res.json({ customer });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error, res);
    next(error);
  }
}

const findOrCreateConversationSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
});

export async function postFindOrCreateConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = findOrCreateConversationSchema.parse(req.body);
    const conversation = await automationService.findOrCreateConversation(body.businessId, body.customerId);
    res.json({ conversation });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error, res);
    next(error);
  }
}

const postMessageSchema = z.object({
  conversationId: z.string().uuid(),
  senderType: z.enum(['customer', 'ai']),
  content: z.string().min(1),
});

export async function postMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = postMessageSchema.parse(req.body);
    await automationService.appendMessage(body.conversationId, body.senderType, body.content);
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error, res);
    next(error);
  }
}

const orderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  productName: z.string().min(1),
  qty: z.number().int().positive(),
  price: z.number().nonnegative(),
});

const postOrderSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(orderItemSchema).min(1),
  deliveryAddress: z.string().optional(),
  city: z.string().optional(),
});

export async function postOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = postOrderSchema.parse(req.body);
    const order = await automationService.createOrder(body.businessId, {
      customerId: body.customerId,
      items: body.items,
      deliveryAddress: body.deliveryAddress,
      city: body.city,
    });
    res.status(201).json({ order });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error, res);
    next(error);
  }
}

const dedupeSchema = z.object({ messageId: z.string().min(1) });

export async function postDedupe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { messageId } = dedupeSchema.parse(req.body);
    const alreadyProcessed = await automationService.checkAndMarkProcessed(messageId);
    res.json({ alreadyProcessed });
  } catch (error) {
    if (error instanceof ZodError) return handleZodError(error, res);
    next(error);
  }
}
