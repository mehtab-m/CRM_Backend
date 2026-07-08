/**
 * Seeds the CRM_Owner account.
 * Run: npm run add-superadmin
 * Requires DATABASE_URL and JWT_SECRET in .env
 */
import { db, pool } from '../src/db/client.js';
import { users } from '../src/db/schema/index.js';
import { hashPassword } from '../src/lib/password.js';

const FULL_NAME = 'CRM Owner';
const EMAIL = 'meh@gmail.com';
const PASSWORD = 'Kiahalmalik@1122';

async function main(): Promise<void> {
  const email = EMAIL.toLowerCase();
  const passwordHash = await hashPassword(PASSWORD);

  await db
    .insert(users)
    .values({
      email,
      passwordHash,
      fullName: FULL_NAME,
      role: 'crm_owner',
      businessId: null,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        fullName: FULL_NAME,
        role: 'crm_owner',
        businessId: null,
        isActive: true,
      },
    });

  console.log(`CRM_Owner ready: ${email}`);
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
