# ReachInbox Full-Stack Email Job Scheduler – Architecture Documentation

This document describes the high-level architecture, scheduling algorithms, distributed rate-limiting mechanisms, crash recovery, and external integrations of the ReachInbox Email Job Scheduler.

---

## 1. System Architecture Overview

The system is designed with a decoupled, asynchronous, and horizontally scalable architecture:

```mermaid
graph TD
    Client["Frontend Dashboard (React / Vite)"] -->|REST API & OAuth| APIServer["API Server (Express / TypeScript)"]
    APIServer -->|Persist Metadata| PostgreSQL[(PostgreSQL)]
    APIServer -->|Enqueue Delayed Jobs| Redis[(Redis / BullMQ)]
    APIServer -->|Index Emails| Elasticsearch[(Elasticsearch)]
    APIServer -->|OAuth Connect| GoogleOAuth["Google OAuth 2.0"]
    APIServer -->|OAuth Connect| SlackOAuth["Slack OAuth 2.0"]

    WorkerProcess["Worker Process(es) (BullMQ / TypeScript)"] -->|Fetch Due Jobs| Redis
    WorkerProcess -->|Atomic Rate Limit & Last-Sent| Redis
    WorkerProcess -->|Verify Idempotency & Update Status| PostgreSQL
    WorkerProcess -->|Update Search Index| Elasticsearch
    WorkerProcess -->|Send Outbound Emails| EtherealSMTP["Ethereal Fake SMTP"]
    WorkerProcess -->|Hourly Limit Alert| SlackWebhook["Slack API / Webhook"]
    
    AdminUser["DevOps / Engineers"] -->|Queue Monitoring| BullBoard["Bull Board Dashboard (/admin/queues)"]
```

---

## 2. Core Scheduling & Throttling Flow

When a user schedules an email campaign:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Frontend
    participant API as API Server
    participant DB as PostgreSQL
    participant ES as Elasticsearch
    participant Redis as Redis / BullMQ

    User->>API: POST /campaigns (Recipients, StartTime, Delay, Limit)
    API->>API: Sanitize & Deduplicate Email Leads
    API->>API: Calculate Scheduled Timestamps (StartTime + index * DelayMs)
    API->>DB: Transaction: Save Campaign & Email records
    API->>Redis: Bulk Add BullMQ Delayed Jobs (with deterministic IDs)
    API-->>ES: Bulk Index Email Documents (Async)
    API-->>User: 201 Created (Scheduled Count, Campaign ID)
```

---

## 3. Worker Execution, Rate Limiting & Idempotency Flow

Workers execute jobs with configurable concurrency and distributed safety:

```mermaid
flowchart TD
    Start([Worker picks up due job]) --> CheckDB{Already Sent in DB?}
    CheckDB -- Yes --> SkipDuplicate[Skip job & acknowledge - Prevent Duplicate]
    CheckDB -- No --> CheckRateLimit{Redis Atomic Rate Limit: Count <= HourlyLimit?}

    CheckRateLimit -- Limit Exceeded --> RescheduleWindow[Calculate Next Hour Window]
    RescheduleWindow --> UpdateDBRescheduled[Update DB status = 'rescheduled']
    RescheduleWindow --> RequeueBullMQ[Re-enqueue delayed job in BullMQ]
    RescheduleWindow --> CheckSlack{Slack Connected & First Alert in Hour?}
    CheckSlack -- Yes --> SendSlack[Post Real Alert to Slack Channel]
    CheckSlack -- No --> EndReschedule([Acknowledge original job])
    SendSlack --> EndReschedule

    CheckRateLimit -- Allowed --> CheckDelay{Elapsed time since last send < MinDelayMs?}
    CheckDelay -- Yes --> WaitThrottle[Wait remainder of MinDelayMs]
    CheckDelay -- No --> TransitionProcessing
    WaitThrottle --> TransitionProcessing

    TransitionProcessing[Atomic DB UPDATE: status='processing'] --> SendSMTP[Deliver via Ethereal SMTP]
    SendSMTP -- Success --> UpdateSuccess[Update DB: status='sent', sent_at, preview_url]
    UpdateSuccess --> UpdateES[Update Elasticsearch Index]
    UpdateSuccess --> IncrementCampaign[Increment Campaign sent_count]
    IncrementCampaign --> CompleteJob([Job Completed])

    SendSMTP -- Failure --> CheckRetries{Attempts < MaxAttempts?}
    CheckRetries -- Yes --> RetryBackoff[BullMQ Exponential Backoff Retry]
    CheckRetries -- No --> MarkFailed[Update DB: status='failed', failure_reason]
    MarkFailed --> UpdateESFail[Update Elasticsearch: failed]
```

---

## 4. Server Restart & Crash Resilience

Why jobs survive server restarts without loss or duplication:

```mermaid
stateDiagram-v2
    [*] --> ScheduledInRedis: Job enqueued with delay
    ScheduledInRedis --> ServerCrashes: API or Worker process dies
    ServerCrashes --> StatePreservedInRedis: Redis AOF / RDB retains delayed sorted sets
    StatePreservedInRedis --> ServerRestarts: Worker process restarts
    ServerRestarts --> DelayedJobBecomesActive: Scheduled timestamp arrives
    DelayedJobBecomesActive --> IdempotencyVerified: DB checked for existing sent_at
    IdempotencyVerified --> EmailSent: Email sent safely
```

1. **Persistent Delayed Jobs in Redis**: BullMQ stores delayed jobs in Redis sorted sets (`bull:reachinbox-email-queue:delayed`) keyed by the exact unix timestamp when they are due. When the worker or server crashes, Redis retains these keys.
2. **Deterministic Job IDs**: Every job is assigned an ID in the format `email:<uuid>`. If a worker attempts to register or re-queue the same email, BullMQ rejects duplicates.
3. **Database Idempotency Transitions**: Even if a network partition causes a worker to re-read a job, the worker executes an atomic SQL query:
   ```sql
   UPDATE emails SET status = 'processing', attempts = attempts + 1
   WHERE id = $1 AND status != 'sent' RETURNING *;
   ```
   If the email was already sent, this statement returns zero rows and the worker skips sending immediately.

---

## 5. Distributed Hourly Rate Limiting Design

- **Granular Keying**: Redis counter key is computed as `ratelimit:sender:{senderId}:{hourWindow}` where `hourWindow = Math.floor(Date.now() / 3600000)`.
- **Atomic Lua Script**:
  ```lua
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], 7200)
  end
  return current
  ```
- **Order Preservation**: When the limit is exceeded, jobs are rescheduled with a delay equal to `(nextHourWindow - now) + index * delayMs`, ensuring that original ordering is preserved into subsequent windows.
- **Slack Alert Throttling**: An atomic `SET notified:slack:{senderId}:{hourWindow} 1 EX 7200 NX` ensures only one alert is dispatched per sender per hour window.
