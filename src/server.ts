import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection, pool } from './db/client.js';

async function main(): Promise<void> {
  await checkDatabaseConnection();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      pool
        .end()
        .catch((err) => console.error(err))
        .finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
