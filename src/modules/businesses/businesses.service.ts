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
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBusinessBody {
  name?: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappBusinessAccountId?: string;
  notifyEmail?: string;
}

function toBusinessDto(b: Business): BusinessDto {
  return {
    id: b.id,
    name: b.name,
    whatsappPhoneNumberId: b.whatsappPhoneNumberId ?? undefined,
    whatsappAccessToken: b.whatsappAccessToken ?? undefined,
    whatsappBusinessAccountId: b.whatsappBusinessAccountId ?? undefined,
    notifyEmail: b.notifyEmail ?? undefined,
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
}

export const businessesService = new BusinessesService();
