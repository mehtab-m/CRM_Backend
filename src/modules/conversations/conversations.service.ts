import { and, desc, eq, sql } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db } from '../../db/client.js';
import { conversations, customers, messages } from '../../db/schema/index.js';
import type { Conversation, ConversationStatus, Message } from '../../db/schema/index.js';

export interface ConversationDto {
  id: string;
  businessId: string;
  customerId: string;
  customerName?: string;
  customerPhone: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessage?: string;
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

function toConversationDto(
  c: Conversation,
  customerName?: string | null,
  customerPhone?: string,
  lastMessage?: string | null,
): ConversationDto {
  return {
    id: c.id,
    businessId: c.businessId,
    customerId: c.customerId,
    customerName: customerName ?? undefined,
    customerPhone: customerPhone ?? '',
    status: c.status,
    unreadCount: c.unreadCount,
    lastMessage: lastMessage ?? undefined,
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

  private async getScopedConversation(bid: string, conversationId: string): Promise<Conversation> {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.businessId, bid)))
      .limit(1);
    if (!conv) throw new AppError(404, 'Conversation not found');
    return conv;
  }

  async list(businessId: string | null): Promise<ConversationDto[]> {
    const bid = this.assertBusinessId(businessId);
    const rows = await db
      .select({
        conversation: conversations,
        customer: customers,
        lastMessage: sql<string | null>`(
          select ${messages.content} from ${messages}
          where ${messages.conversationId} = ${conversations.id}
          order by ${messages.createdAt} desc limit 1
        )`,
      })
      .from(conversations)
      .leftJoin(customers, eq(conversations.customerId, customers.id))
      .where(eq(conversations.businessId, bid))
      .orderBy(desc(conversations.lastMessageAt));

    return rows.map((r) =>
      toConversationDto(r.conversation, r.customer?.name, r.customer?.phoneNumber, r.lastMessage)
    );
  }

  // Returns the existing conversation for a customer, or creates one.
  async getOrCreate(businessId: string | null, customerId: string): Promise<ConversationDto> {
    const bid = this.assertBusinessId(businessId);

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.businessId, bid)))
      .limit(1);
    if (!customer) throw new AppError(404, 'Customer not found');

    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.customerId, customerId), eq(conversations.businessId, bid)))
      .limit(1);
    if (existing) {
      return toConversationDto(existing, customer.name, customer.phoneNumber);
    }

    const [created] = await db
      .insert(conversations)
      .values({ businessId: bid, customerId, status: 'active', unreadCount: 0 })
      .returning();

    return toConversationDto(created, customer.name, customer.phoneNumber);
  }

  async getMessages(businessId: string | null, conversationId: string): Promise<MessageDto[]> {
    const bid = this.assertBusinessId(businessId);
    await this.getScopedConversation(bid, conversationId);

    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return rows.map(toMessageDto);
  }

  async sendMessage(businessId: string | null, conversationId: string, content: string): Promise<MessageDto> {
    const bid = this.assertBusinessId(businessId);
    await this.getScopedConversation(bid, conversationId);

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

  // Clears the unread badge when the agent opens a conversation.
  async markRead(businessId: string | null, conversationId: string): Promise<ConversationDto> {
    const bid = this.assertBusinessId(businessId);
    const conv = await this.getScopedConversation(bid, conversationId);

    const [updated] = await db
      .update(conversations)
      .set({ unreadCount: 0 })
      .where(eq(conversations.id, conversationId))
      .returning();

    const [customer] = await db
      .select({ name: customers.name, phoneNumber: customers.phoneNumber })
      .from(customers)
      .where(eq(customers.id, conv.customerId))
      .limit(1);

    return toConversationDto(updated, customer?.name, customer?.phoneNumber);
  }

  async updateStatus(
    businessId: string | null,
    conversationId: string,
    status: ConversationStatus,
  ): Promise<ConversationDto> {
    const bid = this.assertBusinessId(businessId);
    const conv = await this.getScopedConversation(bid, conversationId);

    const [updated] = await db
      .update(conversations)
      .set({ status })
      .where(eq(conversations.id, conversationId))
      .returning();

    const [customer] = await db
      .select({ name: customers.name, phoneNumber: customers.phoneNumber })
      .from(customers)
      .where(eq(customers.id, conv.customerId))
      .limit(1);

    return toConversationDto(updated, customer?.name, customer?.phoneNumber);
  }
}

export const conversationsService = new ConversationsService();
