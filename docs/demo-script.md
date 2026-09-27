# ReachInbox Hiring Assignment – Demo Video Walkthrough Script (5 Minutes Max)

This script outlines the exact chronological flow to record an engaging, high-impact demonstration under 5 minutes.

---

### Segment 1: Introduction & Architecture (0:00 - 0:45)
- **Visual**: Show project repository, `docker-compose.yml`, and the architecture diagram in `docs/architecture.md`.
- **Narration**:
  > *"Hi everyone, this is the ReachInbox Full-Stack Email Job Scheduler. Today I'll demonstrate reliable cold email scheduling at scale using BullMQ, Redis, PostgreSQL, Elasticsearch, and Ethereal SMTP. We will cover persistent job scheduling without cron jobs, distributed hourly rate limiting with live Slack notifications, Elasticsearch-powered search, and complete server restart recovery."*

---

### Segment 2: Authentication & Clean Dashboard (0:45 - 1:30)
- **Visual**:
  1. Open frontend at `http://localhost:3000`. Show Google OAuth sign-in button.
  2. Click "Sign in with Google" (or click "Continue as Demo Evaluator").
  3. Show the Dashboard matching the Figma specification:
     - Header with ReachInbox branding, Elasticsearch search bar, Slack status badge, BullMQ Queue Board link, and user profile avatar.
     - Real-time metric cards (Scheduled Queued, Delivered Emails, Delivery Health, Sender Mailboxes).
     - Tabs for "Scheduled Emails" and "Sent Emails".

---

### Segment 3: CSV Lead Parsing & Scheduling a Campaign (1:30 - 2:30)
- **Visual**:
  1. Click **"+ Compose New Email"**.
  2. Select sender from the dropdown.
  3. Enter subject: *"Accelerate your sales pipeline with ReachInbox AI"*.
  4. Enter email body with personalization placeholder.
  5. Upload a CSV/text file with lead emails (or paste a comma-separated list with duplicates and invalid formats).
  6. Highlight the real-time parser showing **Total Rows, Valid Leads, Duplicates Removed, and Invalid count**.
  7. Set start time (e.g., 30 seconds in the future), set delay (2 seconds), set hourly limit (e.g., 5 or 100).
  8. Click **"Schedule (X Emails)"**.
  9. Show emails immediately appearing in the "Scheduled Emails" table with delayed timestamps.
  10. Open BullMQ Dashboard (`/admin/queues`) in another tab to show the delayed jobs queued in Redis.

---

### Segment 4: Worker Execution & Ethereal SMTP Delivery (2:30 - 3:15)
- **Visual**:
  1. Switch to the terminal running `npm run dev:worker` to show live structured logs (`EMAIL_SEND_STARTED`, `EMAIL_SEND_SUCCESS`, concurrency, minimum delay enforcement).
  2. Switch back to the dashboard and switch to the **"Sent Emails"** tab.
  3. Show emails transitioned to "Delivered".
  4. Click the **"View Ethereal"** preview button next to a delivered email.
  5. Show the actual email opened in the browser on `ethereal.email` showing headers, subject, body, and timestamp.

---

### Segment 5: Elasticsearch Full-Text Search (3:15 - 3:45)
- **Visual**:
  1. In the top search bar, type a recipient name or keyword from the subject/body (e.g. `reachinbox` or a prospect domain).
  2. Show instant filtering returned by Elasticsearch.
  3. Clear the search bar to show the complete list.

---

### Segment 6: Rate Limiting & Slack Live Notification (3:45 - 4:15)
- **Visual**:
  1. In the header, show the "Connect Slack" button and active connection.
  2. Trigger a batch of emails that exceeds the sender's hourly limit (e.g. limit set to 3/hr).
  3. Point to the terminal logs showing:
     - `Sender hourly rate limit threshold exceeded`.
     - `Rescheduling job to next hour window`.
     - `Dispatched real Slack rate-limit alert`.
  4. Show the live notification received in the Slack channel.
  5. Show that jobs were NOT dropped or failed, but rescheduled to the next hour window in the dashboard.

---

### Segment 7: Server Restart Recovery & Conclusion (4:15 - 5:00)
- **Visual**:
  1. Schedule a batch of emails for 1 minute in the future.
  2. In the terminal, kill the API and worker (`Ctrl+C`).
  3. Show the servers are completely offline.
  4. Restart both (`npm run dev:api` and `npm run dev:worker`).
  5. Show that BullMQ in Redis retained all delayed jobs, picks up right on schedule, and sends future emails without duplicates or re-sending past emails.
  6. Wrap up with brief summary of test suites (`npm test`) and 1000+ job simulation.
