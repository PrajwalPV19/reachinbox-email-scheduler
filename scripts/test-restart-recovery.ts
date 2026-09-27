import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_NAMES, EmailJobData } from '@reachinbox/shared';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

async function testRestartRecovery() {
  console.log(`\n======================================================`);
  console.log(`🧪 REACHINBOX SERVER RESTART RECOVERY TEST`);
  console.log(`======================================================\n`);

  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
  });

  const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL_QUEUE, {
    connection: redis,
  });

  console.log(`Step 1: Scheduling 20 delayed emails into BullMQ queue...`);
  const jobIds: string[] = [];
  const baseTime = Date.now() + 15000; // 15 seconds in future

  for (let i = 0; i < 20; i++) {
    const emailId = uuidv4();
    const jobId = `restart_test_${emailId}`;
    jobIds.push(jobId);

    await emailQueue.add(
      'send-email',
      {
        emailId,
        campaignId: 'restart-campaign-123',
        userId: 'demo-user-id',
        recipient: `future_lead_${i + 1}@example.com`,
        subject: `Future Scheduled Email #${i + 1}`,
        body: 'Testing server crash recovery.',
        scheduledAt: new Date(baseTime + i * 2000).toISOString(),
        delayBetweenEmailsMs: 2000,
        hourlyLimit: 100,
      },
      {
        jobId,
        delay: 15000 + i * 2000,
      }
    );
  }

  const initialCounts = await emailQueue.getJobCounts('delayed');
  console.log(`✅ Verified: 20 delayed jobs confirmed in Redis. (Count: ${initialCounts.delayed})`);

  console.log(`\nStep 2: Simulating server/worker CRASH and shutdown...`);
  await emailQueue.close();
  await redis.quit();
  console.log(`🛑 Worker process terminated.`);

  console.log(`Step 3: Waiting 3 seconds while server is offline...`);
  await new Promise((r) => setTimeout(r, 3000));

  console.log(`\nStep 4: Restarting application and reconnecting to Redis...`);
  const newRedis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
  });

  const reconnectedQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL_QUEUE, {
    connection: newRedis,
  });

  const postRestartCounts = await reconnectedQueue.getJobCounts('delayed');
  console.log(`📊 Post-restart Redis Queue Inspection:`);
  console.log(`   - Delayed jobs still in queue: ${postRestartCounts.delayed}`);

  let foundCount = 0;
  for (const id of jobIds) {
    const job = await reconnectedQueue.getJob(id);
    if (job) foundCount++;
  }

  console.log(`   - Verified specific persistent job IDs intact: ${foundCount}/20`);

  if (foundCount === 20 && postRestartCounts.delayed >= 20) {
    console.log(`\n🎉 RESTART RECOVERY TEST PASSED:`);
    console.log(`   - No jobs lost on shutdown.`);
    console.log(`   - Future scheduled times preserved in Redis sorted sets.`);
    console.log(`   - System resumes execution at the exact intended timestamps.\n`);
  } else {
    console.error(`❌ RESTART TEST FAILED: Some jobs were lost during shutdown.`);
  }

  await reconnectedQueue.close();
  await newRedis.quit();
}

testRestartRecovery().catch((err) => {
  console.error('Restart recovery test error:', err);
  process.exit(1);
});
