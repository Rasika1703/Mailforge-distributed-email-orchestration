
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const app = createApp();

const server = app.listen(env.port, '0.0.0.0', () => {
  logger.info(`ReachInbox API listening on port ${env.port}`);
});

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down gracefully`);

  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

