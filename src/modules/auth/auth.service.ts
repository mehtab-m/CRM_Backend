import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { db, isUniqueViolation } from '../../db/client.js';
import { businesses, users } from '../../db/schema/index.js';
import { signAccessToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { toAuthUser, type AuthUserDto } from './auth.mapper.js';
import type { LoginBody, RegisterBody } from './auth.validation.js';

const userWithBusiness = {
  id: users.id,
  email: users.email,
  passwordHash: users.passwordHash,
  fullName: users.fullName,
  phone: users.phone,
  role: users.role,
  isActive: users.isActive,
  businessId: users.businessId,
  businessName: businesses.name,
};

function selectUserWithBusiness() {
  return db
    .select(userWithBusiness)
    .from(users)
    .leftJoin(businesses, eq(users.businessId, businesses.id));
}

export class AuthService {
  async register(body: RegisterBody): Promise<{ token: string; user: AuthUserDto }> {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (existing.length > 0) {
      throw new AppError(409, 'Email already registered');
    }

    const passwordHash = await hashPassword(body.password);

    try {
      const { user, business } = await db.transaction(async (tx) => {
        const [business] = await tx
          .insert(businesses)
          .values({ name: body.businessName })
          .returning();
        const [user] = await tx
          .insert(users)
          .values({
            email: body.email,
            passwordHash,
            fullName: body.fullName,
            phone: body.phone ?? null,
            role: 'business_owner',
            businessId: business.id,
          })
          .returning();
        return { user, business };
      });

      const token = signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        businessId: business.id,
      });

      return {
        token,
        user: toAuthUser({
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          businessName: business.name,
        }),
      };
    } catch (err) {
      // Closes the race where two requests register the same email concurrently.
      if (isUniqueViolation(err)) {
        throw new AppError(409, 'Email already registered');
      }
      throw err;
    }
  }

  async login(body: LoginBody): Promise<{ token: string; user: AuthUserDto }> {
    const [row] = await selectUserWithBusiness().where(eq(users.email, body.email)).limit(1);
    if (!row || !row.isActive) {
      throw new AppError(401, 'Invalid email or password');
    }

    const ok = await verifyPassword(body.password, row.passwordHash);
    if (!ok) {
      throw new AppError(401, 'Invalid email or password');
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.id));

    const token = signAccessToken({
      sub: row.id,
      email: row.email,
      role: row.role,
      businessId: row.businessId,
    });

    return {
      token,
      user: toAuthUser({
        email: row.email,
        fullName: row.fullName,
        role: row.role,
        phone: row.phone,
        businessName: row.businessName,
      }),
    };
  }

  async getMe(userId: string): Promise<{ user: AuthUserDto }> {
    // Tokens minted before the Postgres migration carry a Mongo ObjectId in
    // `sub`; anything that is not a uuid must 401 instead of erroring in the DB.
    if (!z.string().uuid().safeParse(userId).success) {
      throw new AppError(401, 'Unauthorized');
    }

    const [row] = await selectUserWithBusiness().where(eq(users.id, userId)).limit(1);
    if (!row || !row.isActive) {
      throw new AppError(401, 'Unauthorized');
    }

    return {
      user: toAuthUser({
        email: row.email,
        fullName: row.fullName,
        role: row.role,
        phone: row.phone,
        businessName: row.businessName,
      }),
    };
  }
}

export const authService = new AuthService();
