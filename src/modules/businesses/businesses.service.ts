import { eq } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db } from '../../db/client.js';
import { businesses } from '../../db/schema/index.js';
import type { Business } from '../../db/schema/index.js';

export interface BusinessDto {
  id: string;
  name: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappBusinessAccountId?: string;
  notifyEmail?: string;
  aiInstructions?: string;
  aiAutoReplyEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBusinessBody {
  name?: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappBusinessAccountId?: string;
  notifyEmail?: string;
  aiInstructions?: string;
  aiAutoReplyEnabled?: boolean;
}

function toBusinessDto(b: Business): BusinessDto {
  return {
    id: b.id,
    name: b.name,
    whatsappPhoneNumberId: b.whatsappPhoneNumberId ?? undefined,
    whatsappAccessToken: b.whatsappAccessToken ?? undefined,
    whatsappBusinessAccountId: b.whatsappBusinessAccountId ?? undefined,
    notifyEmail: b.notifyEmail ?? undefined,
    aiInstructions: b.aiInstructions ?? undefined,
    aiAutoReplyEnabled: b.aiAutoReplyEnabled,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export class BusinessesService {
  private assertBusinessId(businessId: string | null): string {
    if (!businessId) throw new AppError(403, 'Business account required');
    return businessId;
  }

  async getSettings(businessId: string | null): Promise<BusinessDto> {
    const bid = this.assertBusinessId(businessId);
    const [row] = await db.select().from(businesses).where(eq(businesses.id, bid)).limit(1);
    if (!row) throw new AppError(404, 'Business not found');
    return toBusinessDto(row);
  }

  async updateSettings(businessId: string | null, body: UpdateBusinessBody): Promise<BusinessDto> {
    const bid = this.assertBusinessId(businessId);
    const [existing] = await db.select().from(businesses).where(eq(businesses.id, bid)).limit(1);
    if (!existing) throw new AppError(404, 'Business not found');

    const [updated] = await db
      .update(businesses)
      .set({
        name: body.name ?? existing.name,
        whatsappPhoneNumberId:
          body.whatsappPhoneNumberId !== undefined
            ? body.whatsappPhoneNumberId || null
            : existing.whatsappPhoneNumberId,
        whatsappAccessToken:
          body.whatsappAccessToken !== undefined
            ? body.whatsappAccessToken || null
            : existing.whatsappAccessToken,
        whatsappBusinessAccountId:
          body.whatsappBusinessAccountId !== undefined
            ? body.whatsappBusinessAccountId || null
            : existing.whatsappBusinessAccountId,
        notifyEmail:
          body.notifyEmail !== undefined ? body.notifyEmail || null : existing.notifyEmail,
        aiInstructions:
          body.aiInstructions !== undefined ? body.aiInstructions || null : existing.aiInstructions,
        aiAutoReplyEnabled: body.aiAutoReplyEnabled ?? existing.aiAutoReplyEnabled,
      })
      .where(eq(businesses.id, bid))
      .returning();

    return toBusinessDto(updated);
  }

  // CRM_Owner only: list all businesses
  async listAll(): Promise<BusinessDto[]> {
    const rows = await db.select().from(businesses).orderBy(businesses.createdAt);
    return rows.map(toBusinessDto);
  }

  // Pings Meta's Graph API server-side (browsers can't call it directly —
  // no CORS) so the owner can confirm their WhatsApp credentials actually work.
  async testWhatsappConnection(
    businessId: string | null,
  ): Promise<{ connected: boolean; displayPhoneNumber?: string; verifiedName?: string; error?: string }> {
    const bid = this.assertBusinessId(businessId);
    const [row] = await db.select().from(businesses).where(eq(businesses.id, bid)).limit(1);
    if (!row) throw new AppError(404, 'Business not found');

    if (!row.whatsappPhoneNumberId || !row.whatsappAccessToken) {
      return { connected: false, error: 'Add your WhatsApp phone number ID and access token first' };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${row.whatsappPhoneNumberId}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${row.whatsappAccessToken}` } },
      );
      const data = (await response.json().catch(() => ({}))) as {
        display_phone_number?: string;
        verified_name?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        return { connected: false, error: data.error?.message ?? 'Meta rejected these credentials' };
      }
      return {
        connected: true,
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
      };
    } catch {
      return { connected: false, error: 'Could not reach Meta — try again in a moment' };
    }
  }
}

export const businessesService = new BusinessesService();
