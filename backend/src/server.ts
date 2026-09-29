import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { startEmailWorker } from './workers/email.worker';

const app = createApp();

const worker = startEmailWorker();

const server = app.listen(env.port, () => {
  logger.info(`ReachInbox API listening on port ${env.port}`);
});

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down gracefully`);

  server.close(async () => {
    await worker.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));