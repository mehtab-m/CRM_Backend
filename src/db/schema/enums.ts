import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoles = ['crm_owner', 'business_owner', 'business_employee'] as const;
export type UserRole = (typeof userRoles)[number];
export const userRoleEnum = pgEnum('user_role', userRoles);

export const senderTypes = ['customer', 'ai', 'agent'] as const;
export type SenderType = (typeof senderTypes)[number];
export const senderTypeEnum = pgEnum('sender_type', senderTypes);

export const orderStatuses = ['new', 'confirmed', 'dispatched', 'delivered'] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const orderStatusEnum = pgEnum('order_status', orderStatuses);

export const productStatuses = ['active', 'out_of_stock'] as const;
export type ProductStatus = (typeof productStatuses)[number];
export const productStatusEnum = pgEnum('product_status', productStatuses);

export const conversationStatuses = ['active', 'pending', 'resolved'] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];
export const conversationStatusEnum = pgEnum('conversation_status', conversationStatuses);

// Backend stores 'vip'; the frontend relabels it to "Premium".
export const customerTiers = ['new', 'regular', 'vip'] as const;
export type CustomerTier = (typeof customerTiers)[number];
export const customerTierEnum = pgEnum('customer_tier', customerTiers);
