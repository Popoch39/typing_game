import type Redis from "ioredis";
import { log } from "./logger";
import type { PresenceTracker } from "./presence";
import type { Player } from "./types";

interface RankedQueueEntry {
	player: Player;
	rating: number;
	joinedAt: number;
	duration: number;
}

interface RankedMatchmakingDeps {
	redis: Redis;
	presence: PresenceTracker | null;
	onMatch: (p1: Player, p2: Player, duration: number) => void;
}

export class RankedMatchmaking {
	private redis: Redis;
	private presence: PresenceTracker | null;
	private onMatch: (p1: Player, p2: Player, duration: number) => void;
	// Local cache of player data (since Redis only stores rating as score)
	private playerData = new Map<string, RankedQueueEntry>();
	private matcherInterval: ReturnType<typeof setInterval> | null = null;

	constructor(deps: RankedMatchmakingDeps) {
		this.redis = deps.redis;
		this.presence = deps.presence;
		this.onMatch = deps.onMatch;
	}

	async joinQueue(
		player: Player,
		duration: number,
		rating: number,
	): Promise<void> {
		// Remove from any existing queue first
		await this.leaveQueue(player.userId);

		const key = `ranked:queue:${duration}`;
		const now = Date.now();

		// Store in Redis sorted set with rating as score
		await this.redis.zadd(key, rating, player.userId);

		// Store metadata locally
		this.playerData.set(player.userId, {
			player,
			rating,
			joinedAt: now,
			duration,
		});

		this.presence?.setStatus(player.userId, "queuing");

		const position = await this.redis.zcard(key);
		log.queue("ranked-join", player.userId, duration, position);

		// Send initial queue status
		player.ws.send(
			JSON.stringify({
				type: "ranked_queue_status",
				position,
				estimatedWait: 0,
				searchRange: 100,
			}),
		);
	}

	async leaveQueue(userId: string): Promise<void> {
		const entry = this.playerData.get(userId);
		if (!entry) return;

		const key = `ranked:queue:${entry.duration}`;
		await this.redis.zrem(key, userId);
		this.playerData.delete(userId);
		this.presence?.setStatus(userId, "online");
		log.queue("ranked-leave", userId, entry.duration, 0);
	}

	async handleDisconnect(userId: string): Promise<void> {
		await this.leaveQueue(userId);
	}

	startMatcherLoop(): void {
		if (this.matcherInterval) return;
		this.matcherInterval = setInterval(() => {
			this.runMatcherLoop().catch((err) => {
				console.error("[ranked-matchmaking] matcher error:", err);
			});
		}, 2000);
	}

	stopMatcherLoop(): void {
		if (this.matcherInterval) {
			clearInterval(this.matcherInterval);
			this.matcherInterval = null;
		}
	}

	async runMatcherLoop(): Promise<void> {
		// Process each duration queue
		const durations = new Set<number>();
		for (const entry of this.playerData.values()) {
			durations.add(entry.duration);
		}

		if (durations.size > 0) {
			log.queue("ranked-tick", "", 0, this.playerData.size);
		}

		for (const duration of durations) {
			await this.matchForDuration(duration);
		}
	}

	private async matchForDuration(duration: number): Promise<void> {
		const key = `ranked:queue:${duration}`;

		// Get all players sorted by score (rating)
		const members = await this.redis.zrangebyscore(
			key,
			"-inf",
			"+inf",
			"WITHSCORES",
		);
		log.queue("ranked-scan", "", duration, members.length / 2);
		if (members.length < 4) return; // Need at least 2 players (userId, score pairs)

		// Parse into entries, sorted by joinedAt (oldest first)
		const entries: { userId: string; rating: number; joinedAt: number }[] = [];
		for (let i = 0; i < members.length; i += 2) {
			const userId = members[i] as string;
			const rating = Number.parseFloat(members[i + 1] as string);
			const data = this.playerData.get(userId);
			if (data) {
				entries.push({ userId, rating, joinedAt: data.joinedAt });
			}
		}

		// Sort by joinedAt (oldest first for priority)
		entries.sort((a, b) => a.joinedAt - b.joinedAt);

		const matched = new Set<string>();
		const now = Date.now();

		for (const entry of entries) {
			if (matched.has(entry.userId)) continue;

			const waitSec = (now - entry.joinedAt) / 1000;
			// Range expands over time: ±100 at start, +50 every 5s, no cap after 60s
			const searchRange =
				waitSec >= 60
					? Number.POSITIVE_INFINITY
					: Math.min(500, 100 + 50 * Math.floor(waitSec / 5));

			// Find closest-rated opponent within range
			let bestMatch: (typeof entries)[number] | null = null;
			let bestDiff = Number.POSITIVE_INFINITY;

			for (const candidate of entries) {
				if (candidate.userId === entry.userId) continue;
				if (matched.has(candidate.userId)) continue;

				const diff = Math.abs(entry.rating - candidate.rating);
				if (diff <= searchRange && diff < bestDiff) {
					bestDiff = diff;
					bestMatch = candidate;
				}
			}

			if (bestMatch) {
				matched.add(entry.userId);
				matched.add(bestMatch.userId);

				// Remove both from queue atomically
				await this.redis.zrem(key, entry.userId, bestMatch.userId);

				const p1Data = this.playerData.get(entry.userId);
				const p2Data = this.playerData.get(bestMatch.userId);

				this.playerData.delete(entry.userId);
				this.playerData.delete(bestMatch.userId);

				if (p1Data && p2Data) {
					log.queue("ranked-match", entry.userId, duration, 0);
					this.onMatch(p1Data.player, p2Data.player, duration);
				}
			}
		}
	}

	getQueueSize(duration: number): Promise<number> {
		return this.redis.zcard(`ranked:queue:${duration}`);
	}
}
