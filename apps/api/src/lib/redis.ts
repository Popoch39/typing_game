import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
	maxRetriesPerRequest: 3,
	lazyConnect: true,
	reconnectOnError: () => false,
});

// Suppress unhandled error events (Redis is optional)
redis.on("error", () => {});

export async function initRedis() {
	try {
		await redis.connect();
		console.log("Redis connected");
	} catch (err) {
		console.warn(
			"Redis connection failed, leaderboard features disabled:",
			err,
		);
	}
}
