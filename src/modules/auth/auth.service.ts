import mongoose from 'mongoose';
import { AppError } from '../../common/AppError.js';
import { signAccessToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { BusinessModel, UserModel } from '../../models/index.js';
import type { UserRole } from '../../models/user.model.js';
import { toAuthUser, type AuthUserDto } from './auth.mapper.js';
import type { LoginBody, RegisterBody } from './auth.validation.js';

function businessIdToString(businessId: unknown): string | null {
  if (businessId == null) return null;
  if (businessId instanceof mongoose.Types.ObjectId) {
    return businessId.toHexString();
  }
  if (typeof businessId === 'object' && '_id' in businessId) {
    const id = (businessId as { _id: unknown })._id;
    if (id instanceof mongoose.Types.ObjectId) return id.toHexString();
    if (id != null) return String(id);
  }
  return String(businessId);
}

function businessNameFromPopulated(user: {
  businessId: unknown;
}): string | null {
  if (
    user.businessId &&
    typeof user.businessId === 'object' &&
    user.businessId !== null &&
    'name' in user.businessId
  ) {
    return String((user.businessId as { name: string }).name);
  }
  return null;
}

export class AuthService {
  async register(body: RegisterBody): Promise<{ token: string; user: AuthUserDto }> {
    const existing = await UserModel.findOne({ email: body.email });
    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const business = await BusinessModel.create({ name: body.businessName });
    const passwordHash = await hashPassword(body.password);

    const user = await UserModel.create({
      email: body.email,
      passwordHash,
      fullName: body.fullName,
      phone: body.phone,
      role: 'admin',
      businessId: business._id,
    });

    const populated = await UserModel.findById(user._id).populate('businessId', 'name').lean();
    if (!populated) {
      throw new AppError(500, 'Failed to load user');
    }

    const authUser = toAuthUser({
      email: populated.email,
      fullName: populated.fullName,
      role: populated.role as UserRole,
      phone: populated.phone,
      businessName: businessNameFromPopulated(populated),
    });

    const token = signAccessToken({
      sub: String(user._id),
      email: user.email,
      role: user.role as UserRole,
      businessId: String(business._id),
    });

    return { token, user: authUser };
  }

  async login(body: LoginBody): Promise<{ token: string; user: AuthUserDto }> {
    const user = await UserModel.findOne({ email: body.email }).populate('businessId', 'name');
    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid email or password');
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, 'Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const authUser = toAuthUser({
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      phone: user.phone,
      businessName: businessNameFromPopulated(user),
    });

    const businessId = businessIdToString(user.businessId);

    const token = signAccessToken({
      sub: String(user._id),
      email: user.email,
      role: user.role as UserRole,
      businessId,
    });

    return { token, user: authUser };
  }

  async getMe(userId: string): Promise<{ user: AuthUserDto }> {
    const user = await UserModel.findById(userId).populate('businessId', 'name');
    if (!user || !user.isActive) {
      throw new AppError(401, 'Unauthorized');
    }

    return {
      user: toAuthUser({
        email: user.email,
        fullName: user.fullName,
        role: user.role as UserRole,
        phone: user.phone,
        businessName: businessNameFromPopulated(user),
      }),
    };
  }
}

export const authService = new AuthService();
