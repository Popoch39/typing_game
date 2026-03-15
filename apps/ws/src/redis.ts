import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient: Redis | null = null;
let redisSub: Redis | null = null;

export function getRedis(): Redis {
	if (!redisClient) {
		redisClient = new Redis(REDIS_URL, {
			maxRetriesPerRequest: 3,
			lazyConnect: true,
		});
	}
	return redisClient;
}

export function getRedisSub(): Redis {
	if (!redisSub) {
		redisSub = new Redis(REDIS_URL, {
			maxRetriesPerRequest: 3,
			lazyConnect: true,
		});
	}
	return redisSub;
}

export async function initRedis(): Promise<{ client: Redis; sub: Redis }> {
	const client = getRedis();
	const sub = getRedisSub();
	await Promise.all([client.connect(), sub.connect()]);
	console.log("[redis] connected");
	return { client, sub };
}

export async function closeRedis(): Promise<void> {
	if (redisClient) {
		await redisClient.quit();
		redisClient = null;
	}
	if (redisSub) {
		await redisSub.quit();
		redisSub = null;
	}
}
