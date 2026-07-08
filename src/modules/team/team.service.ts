import { and, eq } from 'drizzle-orm';
import { AppError } from '../../common/AppError.js';
import { db, isUniqueViolation } from '../../db/client.js';
import { users } from '../../db/schema/index.js';
import { hashPassword } from '../../lib/password.js';
import type { User } from '../../db/schema/index.js';

export interface TeamMemberDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'business_employee';
  isActive: boolean;
  createdAt: string;
}

function toTeamMemberDto(u: User): TeamMemberDto {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone ?? undefined,
    role: 'business_employee',
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

export interface CreateTeamMemberBody {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export class TeamService {
  private assertBusinessId(businessId: string | null): string {
    if (!businessId) throw new AppError(403, 'Business account required');
    return businessId;
  }

  async list(businessId: string | null): Promise<TeamMemberDto[]> {
    const bid = this.assertBusinessId(businessId);
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.businessId, bid), eq(users.role, 'business_employee')))
      .orderBy(users.createdAt);
    return rows.map(toTeamMemberDto);
  }

  async create(businessId: string | null, body: CreateTeamMemberBody): Promise<TeamMemberDto> {
    const bid = this.assertBusinessId(businessId);
    const passwordHash = await hashPassword(body.password);

    try {
      const [row] = await db
        .insert(users)
        .values({
          email: body.email.toLowerCase().trim(),
          passwordHash,
          fullName: body.fullName,
          phone: body.phone ?? null,
          role: 'business_employee',
          businessId: bid,
          isActive: true,
        })
        .returning();
      return toTeamMemberDto(row);
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppError(409, 'Email already registered');
      throw err;
    }
  }

  async remove(businessId: string | null, memberId: string): Promise<void> {
    const bid = this.assertBusinessId(businessId);
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.id, memberId), eq(users.businessId, bid), eq(users.role, 'business_employee'))
      )
      .limit(1);
    if (!existing) throw new AppError(404, 'Team member not found');
    await db.delete(users).where(eq(users.id, memberId));
  }
}

export const teamService = new TeamService();
