import { eq, and, isNull, desc} from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '../../common/AppError.js';
import { db, isUniqueViolation } from '../../db/client.js';
import { businesses, passwordResetOtps,users,} from '../../db/schema/index.js';
import { signAccessToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { toAuthUser, type AuthUserDto } from './auth.mapper.js';
import type {LoginBody, RegisterBody, ChangePasswordBody,ForgotPasswordBody,VerifyResetOtpBody, ResetPasswordBody,} from './auth.validation.js';
import { generateOtp } from '../../lib/otp.js';
import { sendPasswordResetOtp } from '../../lib/brevo.js';

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

  async forgotPassword(body: ForgotPasswordBody): Promise<{ message: string }> {
    const [user] = await db
    .select({
      id: users.id,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  // Do not reveal whether the email exists.
     if (!user || !user.isActive) {
      return {
        message: 'If an account exists with that email, an OTP has been sent.',
      };
    }

  // Invalidate any previous unused OTPs for this user.
    await db
    .update(passwordResetOtps)
    .set({
      usedAt: new Date(),
    })
    .where(
      and(
        eq(passwordResetOtps.userId, user.id),
        isNull(passwordResetOtps.usedAt),
      ),
    );

    const otp = generateOtp();

    const otpHash = await hashPassword(otp);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(passwordResetOtps).values({
      userId: user.id,
      otpHash,
      expiresAt,
    });

  await sendPasswordResetOtp(body.email, otp);

  return {
    message: 'If an account exists with that email, an OTP has been sent.',
  };
}
  
  async verifyResetOtp(
  body: VerifyResetOtpBody,
): Promise<{ resetToken: string }> {
  const [user] = await db
    .select({
      id: users.id,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (!user || !user.isActive) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  const [otpRecord] = await db
    .select()
    .from(passwordResetOtps)
    .where(
      and(
        eq(passwordResetOtps.userId, user.id),
        isNull(passwordResetOtps.usedAt),
      ),
    )
    .orderBy(desc(passwordResetOtps.createdAt))
    .limit(1);

  if (!otpRecord) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  if (otpRecord.expiresAt <= new Date()) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  if (otpRecord.attempts >= 5) {
    throw new AppError(400, 'Too many invalid OTP attempts');
  }

  const otpIsValid = await verifyPassword(
    body.otp,
    otpRecord.otpHash,
  );

  if (!otpIsValid) {
    await db
      .update(passwordResetOtps)
      .set({
        attempts: otpRecord.attempts + 1,
      })
      .where(eq(passwordResetOtps.id, otpRecord.id));

    throw new AppError(400, 'Invalid or expired OTP');
  }

  await db
    .update(passwordResetOtps)
    .set({
      verifiedAt: new Date(),
    })
    .where(eq(passwordResetOtps.id, otpRecord.id));

  const resetToken = otpRecord.id;

  return {
    resetToken,
  };
}

async resetPassword(body: ResetPasswordBody): Promise<void> {
  const [otpRecord] = await db
    .select()
    .from(passwordResetOtps)
    .where(
      and(
        eq(passwordResetOtps.id, body.resetToken),
        isNull(passwordResetOtps.usedAt),
      ),
    )
    .limit(1);

  if (!otpRecord) {
    throw new AppError(400, 'Invalid or expired reset token');
  }

  if (!otpRecord.verifiedAt) {
    throw new AppError(400, 'OTP verification required');
  }

  if (otpRecord.expiresAt <= new Date()) {
    throw new AppError(400, 'Invalid or expired reset token');
  }

  const newPasswordHash = await hashPassword(body.newPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash: newPasswordHash,
      })
      .where(eq(users.id, otpRecord.userId));

    await tx
      .update(passwordResetOtps)
      .set({
        usedAt: new Date(),
      })
      .where(eq(passwordResetOtps.id, otpRecord.id));
  });
}

  
  async changePassword(userId: string, body: ChangePasswordBody,): Promise<void> {
    if (!z.string().uuid().safeParse(userId).success) {
      throw new AppError(401, 'Unauthorized');
    }
    const [user] = await db.select({
      id: users.id,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
    if (!user || !user.isActive) {
      throw new AppError(401, 'Unauthorized');
    }
    
    const currentPasswordIsValid = await verifyPassword(
      body.currentPassword,
      user.passwordHash,
    );
    
    if (!currentPasswordIsValid) {
      throw new AppError(400, 'Current password is incorrect');
    }

    if (body.currentPassword === body.newPassword) {
      throw new AppError(400, 'New password must be different from current password',);
    }

    const newPasswordHash = await hashPassword(body.newPassword);

    await db.update(users).set({
      passwordHash: newPasswordHash,
    })
    .where(eq(users.id, userId));
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
