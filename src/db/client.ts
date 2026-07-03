import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

export const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });

// Neon suspends idle connections; without this listener an idle-client
// 'error' event would crash the process.
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const db = drizzle(pool, { schema });

export async function checkDatabaseConnection(): Promise<void> {
  await pool.query('select 1');
}

// drizzle-orm >= 0.44 wraps driver errors in DrizzleQueryError with the
// original pg error on `cause`, so check both levels for code 23505.
export function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  if ((err as { code?: unknown }).code === '23505') return true;
  const cause = (err as { cause?: unknown }).cause;
  return (
    typeof cause === 'object' && cause !== null && (cause as { code?: unknown }).code === '23505'
  );
}
