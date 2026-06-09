import { createServer } from 'http';
import { createApp } from './app.js';
import { createSocketServer } from './socket/socket.server.js';
import { startEmbeddingWorker } from './workers/embedding.worker.js';
import { env } from './config/env.js';
import pino from 'pino';

const logger = pino({ name: 'server' });

async function main() {
  const app = await createApp();
  const httpServer = createServer(app);
  createSocketServer(httpServer);
  startEmbeddingWorker();

  httpServer.listen(env.PORT, () => {
    logger.info(`Say IT API running on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
