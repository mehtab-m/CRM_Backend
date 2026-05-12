import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const userRoles = ['admin', 'superadmin', 'agent'] as const;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: userRoles, default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', default: null },
  },
  { timestamps: true },
);

export type UserRole = (typeof userRoles)[number];

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel = mongoose.models.User ?? mongoose.model('User', userSchema);
