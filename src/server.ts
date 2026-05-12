import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './database/connect.js';

async function main(): Promise<void> {
  await connectDatabase();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
