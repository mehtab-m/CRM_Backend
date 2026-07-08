import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Migrations prefer Neon's direct (unpooled) endpoint when available.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error('Set DATABASE_URL (or DATABASE_URL_UNPOOLED) in .env');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
