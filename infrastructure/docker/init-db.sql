-- ReachInbox Email Job Scheduler Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Senders table (supports multiple sender mailboxes)
CREATE TABLE IF NOT EXISTS senders (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_user VARCHAR(255),
    smtp_pass VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    hourly_limit INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Slack OAuth Connection table
CREATE TABLE IF NOT EXISTS slack_connections (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id VARCHAR(255),
    team_name VARCHAR(255),
    channel_id VARCHAR(255),
    channel_name VARCHAR(255),
    access_token TEXT NOT NULL,
    incoming_webhook_url TEXT,
    connected BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    delay_ms INTEGER NOT NULL DEFAULT 2000,
    hourly_limit INTEGER NOT NULL DEFAULT 100,
    total_emails INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    sender_id VARCHAR(36) REFERENCES senders(id) ON DELETE SET NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    attempts INTEGER NOT NULL DEFAULT 0,
    bull_job_id VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    provider_message_id VARCHAR(255),
    ethereal_preview_url TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & query isolation
CREATE INDEX IF NOT EXISTS idx_emails_recipient ON emails(recipient);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_scheduled_at ON emails(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_emails_campaign_id ON emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_emails_sender_id ON emails(sender_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_idempotency_key ON emails(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_senders_user_id ON senders(user_id);

-- Seed an initial test sender and demo user for local development
INSERT INTO users (id, google_id, name, email, avatar_url)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo-google-id', 'ReachInbox Demo User', 'demo@reachinbox.ai', 'https://ui-avatars.com/api/?name=ReachInbox+User&background=6366f1&color=fff')
ON CONFLICT (id) DO NOTHING;

INSERT INTO senders (id, user_id, email, name, smtp_host, smtp_port, smtp_user, smtp_pass, active, hourly_limit)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'sender1@reachinbox-outreach.com', 'Alex from ReachInbox', 'smtp.ethereal.email', 587, 'alex@ethereal.email', 'testpass123', TRUE, 100),
       ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'sender2@reachinbox-outreach.com', 'Taylor from Growth Team', 'smtp.ethereal.email', 587, 'taylor@ethereal.email', 'testpass456', TRUE, 100)
ON CONFLICT (id) DO NOTHING;
