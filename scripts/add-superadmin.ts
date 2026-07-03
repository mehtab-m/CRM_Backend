/**
 * One-off bootstrap: creates or updates a platform superadmin.
 * Run from server directory: npm run add-superadmin
 * Requires DATABASE_URL and JWT_SECRET in .env (same as the API server).
 *
 * Rotate the password after first login in production; avoid committing real secrets.
 */
import { db, pool } from '../src/db/client.js';
import { users } from '../src/db/schema.js';
import { hashPassword } from '../src/lib/password.js';

const FULL_NAME = 'Mehtab';
const EMAIL = 'mehtab@whatsappcrm.local';
const PASSWORD = 'SuperAdmin123';

async function main(): Promise<void> {
  const email = EMAIL.toLowerCase();
  const passwordHash = await hashPassword(PASSWORD);

  await db
    .insert(users)
    .values({
      email,
      passwordHash,
      fullName: FULL_NAME,
      role: 'superadmin',
      businessId: null,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        fullName: FULL_NAME,
        role: 'superadmin',
        businessId: null,
        isActive: true,
      },
    });

  console.log(`Superadmin ready: ${email}`);
  console.log(`Login with email "${email}" and the configured password.`);
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
