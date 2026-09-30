import session from 'express-session';
import RedisStore from 'connect-redis';

import { redis } from './redis';
import { env } from './env';

export const SESSION_COOKIE_NAME = 'reachinbox.sid';

export const sessionMiddleware = session({
  name: SESSION_COOKIE_NAME,

  store: new RedisStore({
    client: redis,
    prefix: 'session:',
  }),

  secret: env.sessionSecret,

  resave: false,

  saveUninitialized: false,

  cookie: {
    httpOnly: true,

    secure: env.isProduction,

    
    sameSite: env.isProduction ? 'none' : 'lax',

    maxAge: 1000 * 60 * 60 * 24 * 7,

   
  },
});

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    oauthState?: string;
    slackOAuthState?: string;
  }
}