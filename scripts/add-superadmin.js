/**
 * One-off bootstrap: creates or updates a platform superadmin.
 * Run from server directory: npm run add-superadmin
 * Requires MONGODB_URI and JWT_SECRET in .env (same as the API server).
 *
 * Rotate the password after first login in production; avoid committing real secrets.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SALT_ROUNDS = 12;

const FULL_NAME = 'Mehtab';
const EMAIL = 'mehtab@whatsappcrm.local';
const PASSWORD = 'SuperAdmin123';

const userRoles = ['admin', 'superadmin', 'agent'];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: userRoles, default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
  },
  { timestamps: true },
);

const User = mongoose.models.User ?? mongoose.model('User', userSchema);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI in environment (.env).');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  const existing = await User.findOne({ email: EMAIL.toLowerCase() });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.fullName = FULL_NAME;
    existing.role = 'superadmin';
    existing.businessId = null;
    existing.isActive = true;
    await existing.save();
    console.log(`Updated existing user to superadmin: ${EMAIL}`);
  } else {
    await User.create({
      email: EMAIL,
      passwordHash,
      fullName: FULL_NAME,
      role: 'superadmin',
      businessId: null,
      isActive: true,
    });
    console.log(`Created superadmin: ${EMAIL}`);
  }

  console.log(`Login with email "${EMAIL}" and the configured password.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
