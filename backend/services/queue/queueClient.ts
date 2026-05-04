import { Queue } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const pipelineRunsQueue = new Queue('pipeline-runs', {
  connection: redisConnection,
});

export const dlqQueue = new Queue('dlq', {
  connection: redisConnection,
});

export interface PipelineRunJobPayload {
  pipelineRunId: string;
  repoName: string;
  branch: string;
  commitSha: string;
  committer: string;
  webhookEvent: string;
}

export const enqueuePipelineRunJob = async (payload: PipelineRunJobPayload) => {
  await pipelineRunsQueue.add('github.push.main', payload, {
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 500,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
};

export const enqueueDlqJob = async (payload: Record<string, unknown>) => {
  await dlqQueue.add('integration.failure', payload, {
    attempts: 1,
    removeOnComplete: 200,
    removeOnFail: false,
  });
};

export const getQueueHealth = async (): Promise<{ healthy: boolean; error?: string }> => {
  try {
    await pipelineRunsQueue.waitUntilReady();
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Queue health check failed',
    };
  }
};
