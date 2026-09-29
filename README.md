# MailForge – Distributed Email Orchestration Platform

MailForge is a full-stack email scheduling platform that allows users to configure SMTP sender accounts, import recipient lists, schedule email campaigns, control sending rates, and monitor delivery status.

## Features

* Google OAuth authentication
* SMTP sender account management
* CSV recipient import
* Email scheduling with configurable start time
* Per-sender sending delay
* Hourly sending limits
* Delayed job processing with BullMQ
* Redis-backed queue management
* Email status tracking
* Elasticsearch-powered email search
* Slack notifications when sending limits are reached
* Bull Board queue monitoring
* PostgreSQL persistence
* Worker restart and job recovery

## Tech Stack

### Frontend

* React 18
* TypeScript
* Vite
* Tailwind CSS
* TanStack Query

### Backend

* Node.js
* Express
* TypeScript
* Prisma
* PostgreSQL

### Infrastructure

* Redis
* BullMQ
* Bull Board
* Elasticsearch

### Email & Integrations

* Nodemailer
* SMTP
* Ethereal Email
* Google OAuth
* Slack OAuth

## Architecture


React / Vite
     |
     v
Express API
     |
     +---- PostgreSQL / Prisma
     |
     +---- Redis / BullMQ
     |
     +---- Elasticsearch
     |
     +---- Slack
     
BullMQ Worker
     |
     v
   SMTP


PostgreSQL is the primary source of truth for email and scheduling data.

Redis is used for BullMQ jobs, rate limiting, sessions, and temporary coordination.

Elasticsearch is used for searching email records.

The worker process consumes BullMQ jobs and sends emails through SMTP.

## Project Structure


MailForge/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── workers/
│   ├── integrations/
│   └── prisma/
│
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── context/
│
├── docker-compose.yml
└── README.md


## Local Setup

### 1. Start infrastructure


docker compose up -d


This starts:

* PostgreSQL
* Redis
* Elasticsearch

### 2. Configure environment variables

Create the backend environment file:


cp backend/.env.example backend/.env


Create the frontend environment file:


cp frontend/.env.example frontend/.env


Configure the required values in the environment files.

### 3. Install dependencies


npm install


### 4. Generate Prisma client and run migrations


cd backend
npx prisma generate
npx prisma migrate deploy
cd ..


### 5. Start the application

Run the backend:

npm run dev:backend

Run the worker in another terminal:


npm run dev:worker


Run the frontend in another terminal:


npm run dev:frontend


The default development URLs are:

Frontend: http://localhost:5173
Backend:  http://localhost:4000
Bull Board: http://localhost:4000/admin/queues

## Demo Flow

1. Sign in using Google.
2. Open **Settings**.
3. Add an SMTP sender account.
4. Open **Compose**.
5. Enter the email subject and message.
6. Upload a CSV containing recipient email addresses or enter them manually.
7. Configure the start time, delay, and hourly limit.
8. Schedule the batch.
9. Monitor scheduled and sent emails from the application.
10. Use Bull Board to inspect queue jobs.
11. Search emails using the search functionality.
12. Check Slack notifications when the configured sending limit is reached.

## Recipient CSV Format

The recipient CSV can contain email addresses in a column.

Example:

csv:
email
alice@example.com
bob@example.com
charlie@example.com

The application extracts email addresses from the uploaded CSV and displays the detected recipient count before scheduling.

## Email Scheduling

Each scheduled email is stored in PostgreSQL and represented as a BullMQ delayed job.

The worker controls:

* Minimum delay between emails
* Hourly sending limit
* Retry handling
* Email status updates
* Failed delivery handling

The hourly limit and delay can be configured from the Compose page.

## Rate Limiting

Rate limiting is applied per sender account.

For example, if the hourly limit is configured as:

text
100 emails/hour


the worker will not allow more than 100 sends for that sender during the configured hour window.

Emails that reach the limit are retained and scheduled for the next available window instead of being discarded.

## Idempotency

Email records are claimed atomically before processing so that multiple workers cannot process the same email simultaneously.

The system uses an at-least-once delivery model. If a worker crashes after SMTP delivery but before the database status is updated, a retry can potentially result in a duplicate delivery.

## Queue Persistence

Scheduled jobs are stored in Redis through BullMQ rather than only in worker memory.

This allows pending jobs to survive backend or worker restarts.

When the worker starts, it checks for scheduled database records that do not have corresponding queue jobs and restores the missing jobs.

## Search

Email records are indexed in Elasticsearch when their status changes.

Search can be performed using fields such as:

* Recipient
* Subject
* Sender
* Message body

PostgreSQL remains the source of truth.

## Slack Integration

Slack can be connected through OAuth.

When a sender reaches its configured hourly limit, the worker can send a Slack notification containing information about the limit and queued emails.

Notifications are deduplicated so that the same sender does not generate repeated alerts during the same hour.

## Security

Sensitive credentials are encrypted before being stored in PostgreSQL.

This includes:

* SMTP passwords
* Slack access tokens

Authentication uses secure session cookies, and OAuth flows use state validation to protect against request forgery.

## Testing

Backend tests can be run with:
bash
npm run test --workspace backend


Build checks:

bash
npm run build:backend
npm run build:frontend

Lint:

bash
npm run lint --workspace backend
npm run lint --workspace frontend

The test suite covers areas including:

* Email scheduling
* Input validation
* Rate limiting
* Worker processing
* Job recovery
* Elasticsearch search
* Authentication
* Slack notifications
* Duplicate scheduling prevention

## Known Limitations

* Real Google OAuth, Slack OAuth, SMTP, and Elasticsearch integrations require valid credentials and running services.
* The frontend currently has limited automated test coverage.
* Elasticsearch search requires Elasticsearch to be available.
* SMTP delivery depends on the configured mail provider.
* Restart recovery handles jobs missing from Redis, but the database and Redis operations are not part of a single distributed transaction.

## Future Improvements

* Campaign templates
* Email attachments
* Rich-text email editor
* Better recipient validation
* Campaign analytics
* Delivery statistics
* More detailed worker monitoring
* Automated frontend tests
* Improved scheduling controls

## License

This project was created as a full-stack email scheduling and orchestration application.
