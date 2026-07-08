import { and, desc, eq } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db } from '../../db/client.js';
import { conversations, customers, messages } from '../../db/schema/index.js';
import type { Conversation, Message } from '../../db/schema/index.js';

export interface ConversationDto {
  id: string;
  businessId: string;
  customerId: string;
  customerName?: string;
  customerPhone: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderType: 'customer' | 'ai' | 'agent';
  content: string;
  isCustomReply: boolean;
  createdAt: string;
}

function toConversationDto(c: Conversation, customerName?: string | null, customerPhone?: string): ConversationDto {
  return {
    id: c.id,
    businessId: c.businessId,
    customerId: c.customerId,
    customerName: customerName ?? undefined,
    customerPhone: customerPhone ?? '',
    lastMessageAt: c.lastMessageAt?.toISOString(),
    createdAt: c.createdAt.toISOString(),
  };
}

function toMessageDto(m: Message): MessageDto {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderType: m.senderType,
    content: m.content,
    isCustomReply: m.isCustomReply,
    createdAt: m.createdAt.toISOString(),
  };
}

export class ConversationsService {
  private assertBusinessId(businessId: string | null): string {
    if (!businessId) throw new AppError(403, 'Business account required');
    return businessId;
  }

  async list(businessId: string | null): Promise<ConversationDto[]> {
    const bid = this.assertBusinessId(businessId);
    const rows = await db
      .select({
        conversation: conversations,
        customer: customers,
      })
      .from(conversations)
      .leftJoin(customers, eq(conversations.customerId, customers.id))
      .where(eq(conversations.businessId, bid))
      .orderBy(desc(conversations.lastMessageAt));

    return rows.map((r) =>
      toConversationDto(r.conversation, r.customer?.name, r.customer?.phoneNumber)
    );
  }

  async getMessages(businessId: string | null, conversationId: string): Promise<MessageDto[]> {
    const bid = this.assertBusinessId(businessId);

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.businessId, bid)))
      .limit(1);
    if (!conv) throw new AppError(404, 'Conversation not found');

    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return rows.map(toMessageDto);
  }

  async sendMessage(businessId: string | null, conversationId: string, content: string): Promise<MessageDto> {
    const bid = this.assertBusinessId(businessId);

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.businessId, bid)))
      .limit(1);
    if (!conv) throw new AppError(404, 'Conversation not found');

    const [msg] = await db
      .insert(messages)
      .values({
        conversationId,
        senderType: 'agent',
        content,
        isCustomReply: true,
      })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return toMessageDto(msg);
  }
}

export const conversationsService = new ConversationsService();
