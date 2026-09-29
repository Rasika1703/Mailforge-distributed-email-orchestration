import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      SESSION_SECRET: 'test-session-secret',
      FRONTEND_URL: 'http://localhost:5173',
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:4000/api/auth/google/callback',
      ADMIN_USER: 'admin',
      ADMIN_PASSWORD: 'change-me',
      WORKER_CONCURRENCY: '5',
      SLACK_CLIENT_ID: 'slack-client-id',
      SLACK_CLIENT_SECRET: 'slack-client-secret',
      SLACK_REDIRECT_URI: 'http://localhost:4000/api/slack/callback',
      SLACK_API_URL: 'http://127.0.0.1:4599',
      TOKEN_ENCRYPTION_KEY: 'test-encryption-key',
      ELASTICSEARCH_URL: 'http://127.0.0.1:9299',
    },
  },
});
