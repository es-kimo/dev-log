import { syncMrToNotion } from './syncMrNotion.js';

// Job registry
const jobs = {
  syncMr: syncMrToNotion,
} as const;

type JobName = keyof typeof jobs;

/**
 * Run a job by name
 */
export async function runJob(jobName: string): Promise<void> {
  if (!(jobName in jobs)) {
    console.error(`❌ Unknown job: ${jobName}`);
    console.log('Available jobs:', Object.keys(jobs).join(', '));
    process.exit(1);
  }

  const job = jobs[jobName as JobName];

  try {
    console.log(`🚀 Running job: ${jobName}`);
    await job();
    console.log(`✅ Job completed: ${jobName}`);
  } catch (error) {
    console.error(
      `❌ Job failed: ${jobName}`,
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

/**
 * Main function for CLI execution
 */
async function main(): Promise<void> {
  const jobName = process.env.JOB;

  if (!jobName) {
    console.error('❌ JOB environment variable is required');
    console.log('Usage: JOB=<jobName> node dist/jobs/index.js');
    console.log('Available jobs:', Object.keys(jobs).join(', '));
    process.exit(1);
  }

  await runJob(jobName);
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for testing
export { jobs };
