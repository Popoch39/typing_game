import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { PresenceTracker } from "../presence";
import { RankedMatchmaking } from "../ranked-matchmaking";
import type { Player } from "../types";

// Suppress logger output
spyOn(console, "log").mockImplementation(() => {});
spyOn(console, "error").mockImplementation(() => {});

// --- Mock Redis (sorted-set subset) ---

class MockRedis {
	private data = new Map<string, Map<string, number>>(); // key -> (member -> score)

	async zadd(key: string, ...args: (string | number)[]): Promise<number> {
		if (!this.data.has(key)) this.data.set(key, new Map());
		const set = this.data.get(key)!;
		let added = 0;
		for (let i = 0; i < args.length; i += 2) {
			const score = args[i] as number;
			const member = args[i + 1] as string;
			if (!set.has(member)) added++;
			set.set(member, score);
		}
		return added;
	}

	async zrem(key: string, ...members: string[]): Promise<number> {
		const set = this.data.get(key);
		if (!set) return 0;
		let removed = 0;
		for (const m of members) {
			if (set.delete(m)) removed++;
		}
		return removed;
	}

	async zcard(key: string): Promise<number> {
		return this.data.get(key)?.size ?? 0;
	}

	async zrangebyscore(
		key: string,
		_min: string,
		_max: string,
		_withScores?: string,
	): Promise<string[]> {
		const set = this.data.get(key);
		if (!set) return [];
		const entries = [...set.entries()].sort((a, b) => a[1] - b[1]);
		const result: string[] = [];
		for (const [member, score] of entries) {
			result.push(member, String(score));
		}
		return result;
	}
}

// --- Helpers ---

function createPlayer(id: string, name: string): Player {
	return {
		ws: { send: mock(() => {}), close: mock(() => {}) },
		userId: id,
		name,
	};
}

function createMockPresence(): PresenceTracker {
	return {
		setStatus: mock(() => {}),
		getStatus: mock(() => "online"),
		connect: mock(() => {}),
		disconnect: mock(() => {}),
		getOnlineUsers: mock(() => []),
		broadcastPresence: mock(() => {}),
	} as unknown as PresenceTracker;
}

// --- Tests ---

describe("RankedMatchmaking", () => {
	let redis: MockRedis;
	let presence: PresenceTracker;
	let onMatch: ReturnType<typeof mock>;
	let mm: RankedMatchmaking;

	beforeEach(() => {
		redis = new MockRedis();
		presence = createMockPresence();
		onMatch = mock(() => {});
		mm = new RankedMatchmaking({
			redis: redis as unknown as import("ioredis").default,
			presence,
			onMatch,
		});
	});

	// ── joinQueue ──────────────────────────────────────────────

	describe("joinQueue", () => {
		it("adds player to Redis sorted set with correct score (rating)", async () => {
			const p = createPlayer("u1", "Alice");
			await mm.joinQueue(p, 30, 1200);

			const size = await redis.zcard("ranked:queue:30");
			expect(size).toBe(1);
		});

		it("sends ranked_queue_status message to player", async () => {
			const p = createPlayer("u1", "Alice");
			await mm.joinQueue(p, 30, 1200);

			expect(p.ws.send).toHaveBeenCalledTimes(1);
			const msg = JSON.parse(
				(p.ws.send as ReturnType<typeof mock>).mock.calls[0][0] as string,
			);
			expect(msg.type).toBe("ranked_queue_status");
			expect(msg.position).toBe(1);
			expect(msg.searchRange).toBe(100);
		});

		it("removes player from previous queue before adding to new one", async () => {
			const p = createPlayer("u1", "Alice");
			await mm.joinQueue(p, 30, 1200);
			expect(await redis.zcard("ranked:queue:30")).toBe(1);

			// Join a different duration queue
			await mm.joinQueue(p, 60, 1300);
			expect(await redis.zcard("ranked:queue:30")).toBe(0);
			expect(await redis.zcard("ranked:queue:60")).toBe(1);
		});

		it("sets presence to queuing", async () => {
			const p = createPlayer("u1", "Alice");
			await mm.joinQueue(p, 30, 1200);

			expect(presence.setStatus).toHaveBeenCalledWith("u1", "queuing");
		});
	});

	// ── leaveQueue ─────────────────────────────────────────────

	describe("leaveQueue", () => {
		it("removes player from sorted set and local data", async () => {
			const p = createPlayer("u1", "Alice");
			await mm.joinQueue(p, 30, 1200);
			await mm.leaveQueue("u1");

			expect(await redis.zcard("ranked:queue:30")).toBe(0);
		});

		it("does nothing for unknown user", async () => {
			// Should not throw
			await mm.leaveQueue("unknown-id");
		});

		it("sets presence back to online", async () => {
			const p = createPlayer("u1", "Alice");
			await mm.joinQueue(p, 30, 1200);
			await mm.leaveQueue("u1");

			expect(presence.setStatus).toHaveBeenCalledWith("u1", "online");
		});
	});

	// ── handleDisconnect ───────────────────────────────────────

	describe("handleDisconnect", () => {
		it("delegates to leaveQueue", async () => {
			const p = createPlayer("u1", "Alice");
			await mm.joinQueue(p, 30, 1200);
			await mm.handleDisconnect("u1");

			expect(await redis.zcard("ranked:queue:30")).toBe(0);
			expect(presence.setStatus).toHaveBeenCalledWith("u1", "online");
		});
	});

	// ── runMatcherLoop ─────────────────────────────────────────

	describe("runMatcherLoop", () => {
		it("pairs closest-rated players within range", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			await mm.joinQueue(p1, 30, 1200);
			await mm.joinQueue(p2, 30, 1250);

			await mm.runMatcherLoop();

			expect(onMatch).toHaveBeenCalledTimes(1);
			expect(onMatch).toHaveBeenCalledWith(
				expect.objectContaining({ userId: "u1" }),
				expect.objectContaining({ userId: "u2" }),
				30,
			);
		});

		it("does nothing when only 1 player in queue", async () => {
			const p1 = createPlayer("u1", "Alice");
			await mm.joinQueue(p1, 30, 1200);

			await mm.runMatcherLoop();

			expect(onMatch).not.toHaveBeenCalled();
		});

		it("does nothing when players are outside range", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			// Default range is 100, so 200 apart should not match
			await mm.joinQueue(p1, 30, 1000);
			await mm.joinQueue(p2, 30, 1200);

			await mm.runMatcherLoop();

			expect(onMatch).not.toHaveBeenCalled();
		});

		it("expands range over time (5s increments)", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			// 150 apart — outside initial 100 range but within 100 + 50*1 = 150 (after 5s)
			await mm.joinQueue(p1, 30, 1000);
			await mm.joinQueue(p2, 30, 1150);

			// Should NOT match immediately
			await mm.runMatcherLoop();
			expect(onMatch).not.toHaveBeenCalled();

			// Manipulate joinedAt to simulate 5s wait
			// Access private playerData via bracket notation
			const playerData = (
				mm as unknown as { playerData: Map<string, { joinedAt: number }> }
			).playerData;
			const fiveSecondsAgo = Date.now() - 5_000;
			for (const entry of playerData.values()) {
				entry.joinedAt = fiveSecondsAgo;
			}

			// Now range = 100 + 50*floor(5/5) = 150, should match
			await mm.runMatcherLoop();
			expect(onMatch).toHaveBeenCalledTimes(1);
		});

		it("respects max range cap (500) before 60s", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			// 600 apart — beyond the 500 cap
			await mm.joinQueue(p1, 30, 1000);
			await mm.joinQueue(p2, 30, 1600);

			// Simulate 40s wait — range = 100 + 50*8 = 500, still not enough for 600 diff
			const playerData = (
				mm as unknown as { playerData: Map<string, { joinedAt: number }> }
			).playerData;
			const fortySecsAgo = Date.now() - 40_000;
			for (const entry of playerData.values()) {
				entry.joinedAt = fortySecsAgo;
			}

			await mm.runMatcherLoop();
			expect(onMatch).not.toHaveBeenCalled();
		});

		it("forces match after 60s regardless of rating gap", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			// 600 apart
			await mm.joinQueue(p1, 30, 1000);
			await mm.joinQueue(p2, 30, 1600);

			// Simulate 60s wait — range becomes infinite
			const playerData = (
				mm as unknown as { playerData: Map<string, { joinedAt: number }> }
			).playerData;
			const longAgo = Date.now() - 60_000;
			for (const entry of playerData.values()) {
				entry.joinedAt = longAgo;
			}

			await mm.runMatcherLoop();
			expect(onMatch).toHaveBeenCalledTimes(1);
		});

		it("processes oldest players first", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			const p3 = createPlayer("u3", "Charlie");

			await mm.joinQueue(p1, 30, 1000);
			await mm.joinQueue(p2, 30, 1050);
			await mm.joinQueue(p3, 30, 1020);

			// Make p1 the oldest, p3 next oldest
			const playerData = (
				mm as unknown as { playerData: Map<string, { joinedAt: number }> }
			).playerData;
			playerData.get("u1")!.joinedAt = Date.now() - 3000;
			playerData.get("u3")!.joinedAt = Date.now() - 2000;
			playerData.get("u2")!.joinedAt = Date.now() - 1000;

			await mm.runMatcherLoop();

			// p1 (oldest) should be matched with closest-rated = p3 (1020 vs 1000 = 20 diff)
			expect(onMatch).toHaveBeenCalledTimes(1);
			const call = onMatch.mock.calls[0];
			const matchedIds = [call[0].userId, call[1].userId].sort();
			expect(matchedIds).toEqual(["u1", "u3"]);
		});

		it("matched players are removed from queue", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			await mm.joinQueue(p1, 30, 1200);
			await mm.joinQueue(p2, 30, 1250);

			await mm.runMatcherLoop();

			expect(await mm.getQueueSize(30)).toBe(0);
		});

		it("concurrent joins across different durations stay isolated", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			const p3 = createPlayer("u3", "Charlie");
			const p4 = createPlayer("u4", "Diana");

			await mm.joinQueue(p1, 30, 1200);
			await mm.joinQueue(p2, 60, 1200);
			await mm.joinQueue(p3, 30, 1210);
			await mm.joinQueue(p4, 60, 1210);

			await mm.runMatcherLoop();

			expect(onMatch).toHaveBeenCalledTimes(2);

			// First match should be duration 30
			const call0 = onMatch.mock.calls[0];
			const call1 = onMatch.mock.calls[1];

			const durations = [call0[2], call1[2]].sort();
			expect(durations).toEqual([30, 60]);
		});

		it("calls onMatch with both players and correct duration", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			await mm.joinQueue(p1, 45, 1500);
			await mm.joinQueue(p2, 45, 1500);

			await mm.runMatcherLoop();

			expect(onMatch).toHaveBeenCalledTimes(1);
			const [matched1, matched2, duration] = onMatch.mock.calls[0];
			expect(matched1.userId).toBe("u1");
			expect(matched2.userId).toBe("u2");
			expect(duration).toBe(45);
		});
	});

	// ── startMatcherLoop / stopMatcherLoop ─────────────────────

	describe("startMatcherLoop / stopMatcherLoop", () => {
		it("startMatcherLoop creates interval", () => {
			mm.startMatcherLoop();
			const interval = (
				mm as unknown as {
					matcherInterval: ReturnType<typeof setInterval> | null;
				}
			).matcherInterval;
			expect(interval).not.toBeNull();
			mm.stopMatcherLoop();
		});

		it("stopMatcherLoop clears interval", () => {
			mm.startMatcherLoop();
			mm.stopMatcherLoop();
			const interval = (
				mm as unknown as {
					matcherInterval: ReturnType<typeof setInterval> | null;
				}
			).matcherInterval;
			expect(interval).toBeNull();
		});

		it("multiple startMatcherLoop calls don't create multiple intervals", () => {
			mm.startMatcherLoop();
			const first = (
				mm as unknown as {
					matcherInterval: ReturnType<typeof setInterval> | null;
				}
			).matcherInterval;
			mm.startMatcherLoop();
			const second = (
				mm as unknown as {
					matcherInterval: ReturnType<typeof setInterval> | null;
				}
			).matcherInterval;
			expect(first).toBe(second);
			mm.stopMatcherLoop();
		});
	});

	// ── getQueueSize ───────────────────────────────────────────

	describe("getQueueSize", () => {
		it("returns 0 for empty queue", async () => {
			expect(await mm.getQueueSize(30)).toBe(0);
		});

		it("returns correct count after joins", async () => {
			const p1 = createPlayer("u1", "Alice");
			const p2 = createPlayer("u2", "Bob");
			const p3 = createPlayer("u3", "Charlie");

			await mm.joinQueue(p1, 30, 1200);
			expect(await mm.getQueueSize(30)).toBe(1);

			await mm.joinQueue(p2, 30, 1300);
			expect(await mm.getQueueSize(30)).toBe(2);

			await mm.joinQueue(p3, 30, 1400);
			expect(await mm.getQueueSize(30)).toBe(3);
		});
	});
});
