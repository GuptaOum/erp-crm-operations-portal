import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const server = createApp().listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
