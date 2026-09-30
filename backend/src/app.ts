import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './config/logger';
import { sessionMiddleware } from './config/session';
import apiRouter from './routes';
import {
  BULL_BOARD_PATH,
  createBullBoardRouter,
} from './config/bullBoard';
import { adminAuth } from './middleware/adminAuth';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();


  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '2mb' }));

  app.use(
    express.urlencoded({
      extended: true,
    }),
  );

  app.use(cookieParser());


  app.use(sessionMiddleware);

  app.use(
    pinoHttp({
      logger,
    }),
  );

  app.use(
    BULL_BOARD_PATH,
    adminAuth,
    createBullBoardRouter(),
  );

  app.use('/api', apiRouter);

  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
}