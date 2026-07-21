import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { initSockets } from './sockets';
import { env } from './config/env';

async function main() {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);
  initSockets(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`[server] Tournament Management System API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[server] received ${signal}, shutting down gracefully`);
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] fatal startup error', err);
  process.exit(1);
});
