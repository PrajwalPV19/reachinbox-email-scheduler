# ReachInbox Hiring Assignment – Requirement Verification Checklist

| Requirement | Category | Implemented | Implementation Location | Verification Evidence |
|---|---|:---:|---|---|
| **API Email Scheduling** | Backend | Yes | `apps/api/src/routes/campaign.routes.ts`, `CampaignService.createCampaign` | Accepts subject, body, start time, delay, hourly limit, recipients |
| **Relational Database** | Backend | Yes | `infrastructure/docker/init-db.sql`, `apps/api/src/db/client.ts` | PostgreSQL with UUIDs, foreign keys, transaction support |
| **BullMQ Delayed Jobs** | Backend | Yes | `apps/api/src/services/queue.service.ts`, `QueueService.addEmailJobsBulk` | Delayed jobs registered in Redis sorted sets; zero cron jobs |
| **No Cron Constraints** | Backend | Yes | Codebase Audit | Strict constraint verified: 0 instances of `node-cron`, `crontab`, or `setInterval` schedulers |
| **Multiple Senders** | Backend | Yes | `init-db.sql`, `SenderController.ts`, `EmailProcessor.process` | Senders table, per-sender credentials, per-sender limits |
| **Ethereal Fake SMTP** | Backend | Yes | `apps/worker/src/services/email-sender.service.ts` | Nodemailer with Ethereal SMTP; generates live web preview URLs |
| **Elasticsearch Indexing** | Backend | Yes | `apps/api/src/services/elasticsearch.service.ts` | Full mapping created, bulk indexed on campaign creation, updated on send |
| **Elasticsearch Search** | Backend | Yes | `apps/api/src/controllers/email.controller.ts:searchEmails` | Multi-match search across recipient, subject, body with PostgreSQL fallback |
| **BullMQ Live Dashboard** | Backend | Yes | `apps/api/src/services/queue.service.ts:setupBullBoard` | Bull Board mounted at `/admin/queues` showing active, delayed, completed, failed |
| **Server Restart Recovery** | Backend | Yes | `scripts/test-restart-recovery.ts` | Redis AOF persistence retains delayed jobs; resumes execution on exact timestamps |
| **Idempotency Guarantee** | Backend | Yes | `apps/worker/src/processors/email.processor.ts` | Atomic SQL transition to 'processing'; rejects duplicate sends on retries |
| **Worker Concurrency** | Throughput | Yes | `apps/worker/src/worker.ts`, `config.workerConcurrency` | Configurable concurrency in BullMQ Worker; tested safe across parallel jobs |
| **Delay Between Emails** | Throughput | Yes | `apps/worker/src/services/rate-limiter.service.ts:enforceMinDelay` | Redis `lastsent` tracking ensures minimum delay is enforced across instances |
| **Hourly Rate Limiting** | Throughput | Yes | `RateLimiterService.checkAndIncrementRateLimit` | Atomic Redis Lua script keyed by `ratelimit:sender:{id}:{hourWindow}` |
| **Rescheduling on Rate Hit**| Throughput | Yes | `EmailProcessor.process` (step 3) | Jobs moved to next hour window; status updated to 'rescheduled'; order preserved |
| **Slack OAuth & Connect** | Integration| Yes | `apps/api/src/services/slack.service.ts`, `SlackController` | Real OAuth 2.0 flow exchanging code for token; stores connection per user |
| **Slack Alert on Rate Hit**| Integration| Yes | `SlackNotifierService.notifyRateLimitHit` | Live Slack postMessage/webhook on rate limit hit; throttled per hour window |
| **Slack Disconnect/Reconnect**| Integration| Yes | `SlackController.disconnectSlack` | Graceful toggle; no crashes if disconnected; resumes when reconnected |
| **1000+ Email Load** | Performance| Yes | `scripts/simulate-load.ts` | Enqueues 1,000 delayed jobs in batches; verifies Redis memory & delayed counts |
| **Google OAuth Login** | Frontend | Yes | `apps/api/src/services/auth.service.ts`, `apps/web/src/pages/Login.tsx` | Real Google OAuth 2.0 with profile display (Name, Email, Avatar) + Demo fallback |
| **Dashboard Layout** | Frontend | Yes | `apps/web/src/pages/Dashboard.tsx`, `Header.tsx`, `StatCards.tsx` | Closely reproduces Figma design: clean typography, metrics, tabs, responsive |
| **Compose New Email** | Frontend | Yes | `apps/web/src/components/ComposeModal.tsx` | From sender, subject, body, start time, delay, hourly limit, schedule button |
| **CSV/Text Leads Upload** | Frontend | Yes | `ComposeModal.tsx:parseEmailsFromText` | Real-time file parser displaying Total Rows, Valid Leads, Invalid, and Duplicates |
| **Scheduled Emails Table** | Frontend | Yes | `apps/web/src/components/ScheduledTable.tsx` | Recipient, Subject, Scheduled For, Status badge, loading & empty states |
| **Sent Emails Table** | Frontend | Yes | `apps/web/src/components/SentTable.tsx` | Recipient, Subject, Delivered At, Status badge, Ethereal preview link, empty states |
| **Frontend Code Quality** | Frontend | Yes | `apps/web/src/` | Pure TypeScript, reusable components, loading indicators, toast error handling |
| **Docker Compose Setup** | Infra | Yes | `docker-compose.yml`, `infrastructure/docker/` | Docker Compose for PostgreSQL 15, Redis 7, Elasticsearch 8.11 with health checks |
| **Documentation & Guides** | Docs | Yes | `README.md`, `docs/architecture.md`, `docs/demo-script.md` | Complete setup instructions, architecture deep-dive, and 5-min demo video script |
