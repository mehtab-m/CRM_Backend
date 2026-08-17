import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  businesses,
  conversations,
  customers,
  messages,
  processedMessageIds,
  products,
} from '../../db/schema/index.js';
import type { ConversationMode } from '../../db/schema/index.js';
import { ordersService } from '../orders/orders.service.js';
import type { CreateOrderInput, OrderDto } from '../orders/orders.service.js';

export interface AutomationBusinessDto {
  id: string;
  name: string;
  whatsappAccessToken: string | null;
  notifyEmail: string | null;
  aiInstructions: string | null;
  aiAutoReplyEnabled: boolean;
}

export interface AutomationProductDto {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  stock: number;
}

export interface AutomationCustomerDto {
  id: string;
  name: string | null;
  phoneNumber: string;
}

export interface AutomationMessageDto {
  senderType: 'customer' | 'ai' | 'agent';
  content: string;
  createdAt: string;
}

export interface AutomationConversationDto {
  id: string;
  mode: ConversationMode;
  recentMessages: AutomationMessageDto[];
}

export class AutomationService {
  async findBusinessByPhoneNumberId(phoneNumberId: string): Promise<AutomationBusinessDto | null> {
    const [row] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.whatsappPhoneNumberId, phoneNumberId))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      whatsappAccessToken: row.whatsappAccessToken,
      notifyEmail: row.notifyEmail,
      aiInstructions: row.aiInstructions,
      aiAutoReplyEnabled: row.aiAutoReplyEnabled,
    };
  }

  async listActiveProducts(businessId: string): Promise<AutomationProductDto[]> {
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), eq(products.status, 'active')));
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      stock: p.stock,
    }));
  }

  async findOrCreateCustomer(
    businessId: string,
    phoneNumber: string,
    name?: string,
  ): Promise<AutomationCustomerDto> {
    const [existing] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.businessId, businessId), eq(customers.phoneNumber, phoneNumber)))
      .limit(1);

    if (existing) {
      return { id: existing.id, name: existing.name, phoneNumber: existing.phoneNumber };
    }

    const [created] = await db
      .insert(customers)
      .values({ businessId, phoneNumber, name: name ?? null, tier: 'new' })
      .returning();

    return { id: created.id, name: created.name, phoneNumber: created.phoneNumber };
  }

  async findOrCreateConversation(
    businessId: string,
    customerId: string,
  ): Promise<AutomationConversationDto> {
    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.businessId, businessId), eq(conversations.customerId, customerId)))
      .limit(1);

    const conversation =
      existing ??
      (
        await db
          .insert(conversations)
          .values({ businessId, customerId, status: 'active', mode: 'auto', unreadCount: 0 })
          .returning()
      )[0];

    const history = await db
      .select({
        senderType: messages.senderType,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(10);

    return {
      id: conversation.id,
      mode: conversation.mode,
      recentMessages: history
        .reverse()
        .map((m) => ({ senderType: m.senderType, content: m.content, createdAt: m.createdAt.toISOString() })),
    };
  }

  // senderType is restricted to customer|ai here — human agent replies still
  // go through the authenticated /api/conversations endpoint.
  async appendMessage(
    conversationId: string,
    senderType: 'customer' | 'ai',
    content: string,
  ): Promise<void> {
    await db.insert(messages).values({
      conversationId,
      senderType,
      content,
      isCustomReply: false,
    });

    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        ...(senderType === 'customer'
          ? { unreadCount: sql`${conversations.unreadCount} + 1` }
          : {}),
      })
      .where(eq(conversations.id, conversationId));
  }

  async createOrder(businessId: string, input: CreateOrderInput): Promise<OrderDto> {
    return ordersService.create(businessId, input);
  }

  // Returns true if this messageId has already been processed (and records
  // it as seen on first sight) — protects against Meta's webhook retries
  // causing duplicate AI replies / duplicate orders.
  async checkAndMarkProcessed(messageId: string): Promise<boolean> {
    // With RETURNING + ON CONFLICT DO NOTHING, Postgres only returns rows
    // that were actually inserted — an empty result means it was already seen.
    const result = await db
      .insert(processedMessageIds)
      .values({ messageId })
      .onConflictDoNothing({ target: processedMessageIds.messageId })
      .returning({ messageId: processedMessageIds.messageId });

    return result.length === 0;
  }
}

export const automationService = new AutomationService();
