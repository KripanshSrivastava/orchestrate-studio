import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let isConnecting = false;

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const password = process.env.REDIS_PASSWORD;
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';

  return password
    ? `redis://:${encodeURIComponent(password)}@${host}:${port}`
    : `redis://${host}:${port}`;
};

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (!client) {
    client = createClient({
      url: getRedisUrl(),
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });

    client.on('error', (error) => {
      console.error('[redis] client error', error);
    });
  }

  if (!client.isOpen && !isConnecting) {
    isConnecting = true;
    try {
      await client.connect();
    } finally {
      isConnecting = false;
    }
  }

  return client;
};

export const setJsonWithTtl = async (key: string, value: unknown, ttlSeconds: number) => {
  const redisClient = await getRedisClient();
  await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

export const getRedisHealth = async (): Promise<{ connected: boolean; error?: string }> => {
  try {
    const redisClient = await getRedisClient();
    const pong = await redisClient.ping();
    return { connected: pong === 'PONG' };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Redis ping failed',
    };
  }
};
