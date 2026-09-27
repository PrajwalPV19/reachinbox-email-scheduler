# ReachInbox Full-Stack Email Job Scheduler

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.4-red.svg)](https://docs.bullmq.io/)
[![Redis](https://img.shields.io/badge/Redis-7.0-crimson.svg)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.11-yellow.svg)](https://www.elastic.co/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)

> **A production-grade, distributed cold email scheduling service and dashboard built for ReachInbox (Outbox Labs).**
>
> Capable of scheduling outbound outreach sequences with persistent delayed queues, worker concurrency, distributed hourly rate limiting, server crash recovery, real Slack OAuth alerts, Elasticsearch-powered search, and fake SMTP delivery with live web previews.

---

## 🌟 Key Features

### 1. Core Scheduler Behavior
- **BullMQ + Redis Persistent Queues**: Uses BullMQ delayed jobs to schedule emails at specific future timestamps. **Zero cron jobs or interval loops used**.
- **Server Restart Resilience**: All delayed jobs reside in Redis sorted sets. If workers or API servers crash and reboot, jobs survive without data loss or re-sending past emails.
- **Strict Idempotency**: Employs atomic SQL state transitions (`WHERE status != 'sent'`) and unique deterministic job IDs (`email:<uuid>`) to prevent duplicate sends across concurrent workers and retries.
- **Multiple Sender Mailboxes**: Supports multiple sending accounts with dedicated SMTP credentials and configurable per-sender hourly limits.
- **Ethereal Fake SMTP**: Delivers emails using Nodemailer and Ethereal SMTP with clickable live web preview URLs directly accessible from the dashboard.
- **Elasticsearch Search**: Full-text multi-match indexing across recipients, subjects, and email body, with transparent PostgreSQL fallback if Elasticsearch is offline.
- **Live BullMQ Queue Dashboard**: Real-time queue telemetry and retry controls exposed at `/admin/queues` via Bull Board.

### 2. Throughput, Concurrency & Rate Limiting
- **Configurable Worker Concurrency**: BullMQ workers run with configurable parallel threads (`WORKER_CONCURRENCY=5`).
- **Distributed Hourly Rate Limiting**: Enforces strict hourly limits per sender (`MAX_EMAILS_PER_HOUR`) using atomic Redis counters and Lua scripts.
- **Graceful Rescheduling (No Dropped Jobs)**: When a sender reaches its hourly limit, pending emails are automatically rescheduled into the next hour window while preserving sending order.
- **Minimum Send Delay**: Enforces a minimum interval between individual sends (`MIN_EMAIL_DELAY_MS=2000`) to prevent email provider throttling.
- **Real Slack OAuth Alerts**: Users connect their Slack workspace via real OAuth 2.0. The moment a sender hits its hourly threshold, a verified live notification is delivered to Slack.
- **1000+ Email Load Capacity**: Built-in benchmark script verifies scheduling 1,000+ emails in seconds with zero memory leaks.

### 3. Frontend Dashboard
- **Figma Design Fidelity**: Clean, responsive UI built with React, Vite, TypeScript, and Tailwind CSS.
- **Google OAuth Login**: Authentic Google OAuth 2.0 flow displaying user profile avatar, name, and email (with an instant one-click demo login option for quick evaluation).
- **Campaign Composer**: Modal with real-time CSV/text lead parser showing total rows, valid emails, duplicates removed, and invalid rows.
- **Real-Time Tables**: Tabbed interface for "Scheduled Emails" and "Sent Emails" with status badges, skeletons, and empty states.

---

## 🏗 System Architecture

```text
reachinbox-email-scheduler/
├── apps/
│   ├── api/             # Express.js REST API Server + Bull Board
│   ├── worker/          # BullMQ background worker (Rate limiter, SMTP sender)
│   └── web/             # React + Vite + Tailwind CSS frontend dashboard
├── packages/
│   └── shared/          # Shared TypeScript interfaces, types, and constants
├── infrastructure/
│   └── docker/          # PostgreSQL schema init and Elasticsearch mappings
├── docs/
│   ├── architecture.md  # Detailed architecture diagrams (Mermaid)
│   ├── demo-script.md   # Step-by-step 5-minute video walkthrough guide
│   └── requirement-checklist.md # Complete requirement traceability matrix
├── scripts/
│   ├── simulate-load.ts # 1,000+ jobs load benchmark script
│   └── test-restart-recovery.ts # Server restart & crash simulation test
├── docker-compose.yml   # Multi-container PostgreSQL, Redis, Elasticsearch
├── .env.example         # Environment template
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) (v18.x or v20.x)
- [npm](https://www.npmjs.com/) (v9+)

### Step 1: Start Infrastructure Containers
Launch PostgreSQL 15, Redis 7, and Elasticsearch 8:
```bash
docker-compose up -d
```
Verify containers are healthy:
```bash
docker ps
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default values connect automatically to local Docker ports:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox_scheduler`
- `REDIS_URL=redis://localhost:6379`
- `ELASTICSEARCH_URL=http://localhost:9200`

*(Optional)* For real Google and Slack OAuth, set:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`
*(Note: If omitted, the app provides instant demo authentication so you can test all features immediately).*

### Step 3: Install Dependencies & Build
From the repository root:
```bash
npm install
npm run build
```

### Step 4: Run Services
You can run the API server, worker, and frontend concurrently or in separate terminals:

**Terminal 1 (Backend API):**
```bash
npm run dev:api
# API listening at http://localhost:5000
# BullMQ Dashboard at http://localhost:5000/admin/queues
```

**Terminal 2 (Background Worker):**
```bash
npm run dev:worker
# BullMQ worker listening to reachinbox-email-queue
```

**Terminal 3 (Frontend Dashboard):**
```bash
npm run dev:web
# Vite development server running at http://localhost:3000
```

---

## 🖥 Application Endpoints

| Service | URL | Description |
|---|---|---|
| **Frontend Dashboard** | `http://localhost:3000` | Main React UI |
| **API Health Check** | `http://localhost:5000/health` | Status of PostgreSQL, Redis, and Elasticsearch |
| **BullMQ Queue Board** | `http://localhost:5000/admin/queues` | Live visual queue monitor (Delayed, Active, Failed) |
| **Google OAuth URL** | `http://localhost:5000/auth/google` | Google sign-in redirect |
| **Slack OAuth URL** | `http://localhost:5000/slack/connect` | Slack workspace connect redirect |

---

## ⚙️ Core Engineering Design Decisions

### 1. Why No Cron Jobs?
Cron jobs operate on discrete polling intervals (e.g. checking every minute for due records). This introduces polling overhead, database lock contention, and latency jitter.

Instead, we use **BullMQ delayed jobs**:
1. When a campaign is created, each recipient email is converted into a BullMQ delayed job with `delay = Math.max(0, scheduledEpoch - now)`.
2. Redis stores these jobs in an internal sorted set indexed by epoch timestamp.
3. BullMQ's internal timer promotes jobs to `waiting` the exact millisecond they become due.

### 2. Server Restart & Crash Resilience
- When the API server or worker process terminates, all delayed jobs remain untouched in Redis memory (persisted via Redis AOF append-only file).
- Upon restarting, the worker reconnects to Redis and immediately resumes monitoring due jobs.
- Before sending, the worker performs an atomic DB query:
  ```sql
  UPDATE emails SET status = 'processing', attempts = attempts + 1
  WHERE id = $1 AND status != 'sent' RETURNING *;
  ```
  If an email was already delivered before a crash, it is skipped with zero duplication.

### 3. Distributed Rate Limiting & Order Preservation
- Each sender has an hourly limit (e.g. 100 emails/hour).
- Rate limits are tracked across all worker instances in Redis:
  Key: `ratelimit:sender:<senderId>:<hourWindow>` where `hourWindow = Math.floor(Date.now() / 3600000)`.
- When the counter exceeds the limit:
  - The job is **not dropped or marked failed**.
  - Next sending window is computed: `nextWindow = (hourWindow + 1) * 3600000`.
  - The job is re-enqueued into BullMQ with a delay until `nextWindow`.
  - Email status is marked as `rescheduled`.
  - A live notification is dispatched to Slack.

---

## 🧪 Testing & Verification Scripts

### Run Unit and Integration Tests
```bash
npm test
```
Tests cover:
- Atomic sliding-window rate limiting calculations
- Sequential delay calculation
- CSV & text leads file parsing (deduplication, invalid format handling)
- Send idempotency transitions

### Run 1000+ Email Load Simulation
```bash
npm run simulate:load
```
Benchmarks bulk queueing 1,000 delayed email leads into BullMQ and verifies Redis queue persistence and sub-second latency.

### Run Server Restart Recovery Simulation
```bash
npm run test:restart
```
Schedules 20 future emails, terminates the worker connection, waits while offline, restarts, and proves that 100% of jobs survived and resume execution.

---

## 📦 Submission Details
- **Assignment Submission**: [ClickUp Submission Form](https://forms.clickup.com/9005062261/f/8cbwp3n-8876/6NNNJ92DV93PQTAYST)
- **Reviewers**: Mitrajit & Yadav036
- Monorepo package zip archive: `reachinbox-email-scheduler.zip`
