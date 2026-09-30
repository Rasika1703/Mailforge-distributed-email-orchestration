
import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) return fallback;

  const parsed = parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(
      `Environment variable ${name} must be an integer, got: ${raw}`,
    );
  }

  return parsed;
}

const isProd = process.env.NODE_ENV === 'production';

export const env = {
  nodeEnv: optionalEnv('NODE_ENV', 'development'),

  port: intEnv('PORT', 4000),

  frontendUrl: optionalEnv(
    'FRONTEND_URL',
    'http://localhost:5173',
  ),

  databaseUrl: requireEnv('DATABASE_URL'),

  // Redis
  redisUrl: optionalEnv('REDIS_URL', ''),
  redisHost: optionalEnv('REDIS_HOST', 'localhost'),
  redisPort: intEnv('REDIS_PORT', 6379),
  redisPassword: optionalEnv('REDIS_PASSWORD', ''),

  // Elasticsearch
  elasticsearchUrl: optionalEnv('ELASTICSEARCH_URL', ''),

  // Session
  sessionSecret: isProd
    ? requireEnv('SESSION_SECRET')
    : requireEnv(
        'SESSION_SECRET',
        'dev-only-insecure-secret',
      ),

  // Token encryption
  tokenEncryptionKey: isProd
    ? requireEnv('TOKEN_ENCRYPTION_KEY')
    : optionalEnv(
        'TOKEN_ENCRYPTION_KEY',
        'dev-only-insecure-encryption-key',
      ),

  // Google OAuth
  googleClientId: optionalEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: optionalEnv('GOOGLE_CLIENT_SECRET'),

  googleCallbackUrl: isProd
    ? requireEnv('GOOGLE_CALLBACK_URL')
    : optionalEnv(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:4000/api/auth/google/callback',
      ),

  // Ethereal SMTP
  etherealHost: optionalEnv(
    'ETHEREAL_HOST',
    'smtp.ethereal.email',
  ),

  etherealPort: intEnv('ETHEREAL_PORT', 587),

  etherealUser: optionalEnv('ETHEREAL_USER'),
  etherealPassword: optionalEnv('ETHEREAL_PASSWORD'),

  // Slack
  slackClientId: optionalEnv('SLACK_CLIENT_ID'),
  slackClientSecret: optionalEnv('SLACK_CLIENT_SECRET'),

  slackApiUrl: optionalEnv(
    'SLACK_API_URL',
    'https://slack.com/api',
  ),

  slackRedirectUri: optionalEnv(
    'SLACK_REDIRECT_URI',
    'http://localhost:4000/api/slack/callback',
  ),

  // Worker
  workerConcurrency: intEnv('WORKER_CONCURRENCY', 5),

  minEmailDelayMs: intEnv(
    'MIN_EMAIL_DELAY_MS',
    2000,
  ),

  maxEmailsPerHour: intEnv(
    'MAX_EMAILS_PER_HOUR',
    13,
  ),

  // Admin
  adminUser: optionalEnv('ADMIN_USER', 'admin'),
  adminPassword: optionalEnv('ADMIN_PASSWORD', 'admin'),

  isProduction: isProd,
};

