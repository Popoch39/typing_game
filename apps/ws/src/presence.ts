import type Redis from "ioredis";
import { log } from "./logger";
import type { Player } from "./types";

export type PresenceStatus = "online" | "queuing" | "in_game";

const PRESENCE_STATUS_KEY = "presence:status";
const PRESENCE_NAMES_KEY = "presence:names";

export class PresenceTracker {
	private redis: Redis;
	private sockets = new Map<string, Player["ws"]>();
	private broadcastTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(redis: Redis) {
		this.redis = redis;
	}

	async connect(userId: string, name: string, ws: Player["ws"]): Promise<void> {
		this.sockets.set(userId, ws);
		await Promise.all([
			this.redis.hset(PRESENCE_STATUS_KEY, userId, "online"),
			this.redis.hset(PRESENCE_NAMES_KEY, userId, name),
		]);
		log.info(
			`[presence] connect ${name} (${userId.slice(0, 8)}) — sockets: ${this.sockets.size}`,
		);
		this.scheduleBroadcast();
	}

	async disconnect(userId: string): Promise<void> {
		if (!this.sockets.has(userId)) return;
		this.sockets.delete(userId);
		await Promise.all([
			this.redis.hdel(PRESENCE_STATUS_KEY, userId),
			this.redis.hdel(PRESENCE_NAMES_KEY, userId),
		]);
		log.info(
			`[presence] disconnect ${userId.slice(0, 8)} — sockets: ${this.sockets.size}`,
		);
		this.scheduleBroadcast();
	}

	async setStatus(userId: string, status: PresenceStatus): Promise<void> {
		const exists = await this.redis.hexists(PRESENCE_STATUS_KEY, userId);
		if (!exists) return;
		await this.redis.hset(PRESENCE_STATUS_KEY, userId, status);
		this.scheduleBroadcast();
	}

	async getPresenceCounts(): Promise<{
		online: number;
		queuing: number;
		inGame: number;
	}> {
		const values = await this.redis.hvals(PRESENCE_STATUS_KEY);
		let online = 0;
		let queuing = 0;
		let inGame = 0;
		for (const v of values) {
			if (v === "online") online++;
			else if (v === "queuing") queuing++;
			else if (v === "in_game") inGame++;
		}
		return { online, queuing, inGame };
	}

	async getStatus(userId: string): Promise<PresenceStatus | null> {
		const status = await this.redis.hget(PRESENCE_STATUS_KEY, userId);
		return (status as PresenceStatus) ?? null;
	}

	async cleanup(): Promise<void> {
		await Promise.all([
			this.redis.del(PRESENCE_STATUS_KEY),
			this.redis.del(PRESENCE_NAMES_KEY),
		]);
		log.info("[presence] cleanup done");
	}

	private scheduleBroadcast(): void {
		if (this.broadcastTimer) return;
		this.broadcastTimer = setTimeout(() => {
			this.broadcastTimer = null;
			this.broadcastPresence();
		}, 100);
	}

	private async broadcastPresence(): Promise<void> {
		const counts = await this.getPresenceCounts();
		const msg = JSON.stringify({
			type: "presence_update",
			online: counts.online,
			queuing: counts.queuing,
			inGame: counts.inGame,
		});
		for (const ws of this.sockets.values()) {
			try {
				ws.send(msg);
			} catch {}
		}
	}
}
