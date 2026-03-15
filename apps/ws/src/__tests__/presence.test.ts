import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";
import { PresenceTracker } from "../presence";

// Suppress logger output
spyOn(console, "log").mockImplementation(() => {});
spyOn(console, "error").mockImplementation(() => {});

// --- Mock Redis ---

function createMockRedis() {
	const hashes = new Map<string, Map<string, string>>();

	function getHash(key: string): Map<string, string> {
		if (!hashes.has(key)) hashes.set(key, new Map());
		return hashes.get(key)!;
	}

	return {
		hset: mock((key: string, field: string, value: string) => {
			getHash(key).set(field, value);
			return Promise.resolve(1);
		}),
		hget: mock((key: string, field: string) => {
			return Promise.resolve(getHash(key).get(field) ?? null);
		}),
		hdel: mock((key: string, field: string) => {
			const h = getHash(key);
			const had = h.has(field);
			h.delete(field);
			return Promise.resolve(had ? 1 : 0);
		}),
		hexists: mock((key: string, field: string) => {
			return Promise.resolve(getHash(key).has(field) ? 1 : 0);
		}),
		hvals: mock((key: string) => {
			return Promise.resolve([...getHash(key).values()]);
		}),
		del: mock((...keys: string[]) => {
			for (const k of keys) hashes.delete(k);
			return Promise.resolve(keys.length);
		}),
		// expose for assertions
		_hashes: hashes,
	};
}

function createWs() {
	return { send: mock(() => {}), close: mock(() => {}) };
}

function sentMessages(ws: ReturnType<typeof createWs>): any[] {
	return (ws.send as ReturnType<typeof mock>).mock.calls.map((c: unknown[]) =>
		JSON.parse(c[0] as string),
	);
}

function presenceMessages(ws: ReturnType<typeof createWs>) {
	return sentMessages(ws).filter((m) => m.type === "presence_update");
}

/** Flush debounce timer + let async broadcast resolve */
async function flush() {
	// Advance past 100ms debounce
	await new Promise((r) => setTimeout(r, 150));
}

describe("PresenceTracker (Redis)", () => {
	let redis: ReturnType<typeof createMockRedis>;
	let tracker: PresenceTracker;

	beforeEach(() => {
		redis = createMockRedis();
		tracker = new PresenceTracker(redis as any);
	});

	afterEach(async () => {
		// Let pending timers finish to avoid leaks
		await flush();
	});

	describe("connect()", () => {
		it("HSET presence:status + presence:names called", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);
			expect(redis.hset).toHaveBeenCalledWith(
				"presence:status",
				"u1",
				"online",
			);
			expect(redis.hset).toHaveBeenCalledWith("presence:names", "u1", "Alice");
		});

		it("broadcast presence_update with online=1", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);
			await flush();
			const msgs = presenceMessages(ws);
			expect(msgs.length).toBeGreaterThanOrEqual(1);
			const last = msgs[msgs.length - 1];
			expect(last).toEqual({
				type: "presence_update",
				online: 1,
				queuing: 0,
				inGame: 0,
			});
		});

		it("2 connects → online=2", async () => {
			const ws1 = createWs();
			const ws2 = createWs();
			await tracker.connect("u1", "Alice", ws1);
			await tracker.connect("u2", "Bob", ws2);
			await flush();
			const msgs = presenceMessages(ws2);
			const last = msgs[msgs.length - 1];
			expect(last.online).toBe(2);
		});

		it("reconnection (same userId) → socket replaced, count unchanged", async () => {
			const ws1 = createWs();
			const ws2 = createWs();
			await tracker.connect("u1", "Alice", ws1);
			await tracker.connect("u1", "Alice", ws2);
			await flush();
			// ws2 should get broadcast, count still 1
			const msgs = presenceMessages(ws2);
			const last = msgs[msgs.length - 1];
			expect(last.online).toBe(1);
		});
	});

	describe("disconnect()", () => {
		it("HDEL called", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);
			await tracker.disconnect("u1");
			expect(redis.hdel).toHaveBeenCalledWith("presence:status", "u1");
			expect(redis.hdel).toHaveBeenCalledWith("presence:names", "u1");
		});

		it("broadcast with count decremented", async () => {
			const ws1 = createWs();
			const ws2 = createWs();
			await tracker.connect("u1", "Alice", ws1);
			await tracker.connect("u2", "Bob", ws2);
			await flush();

			(ws2.send as ReturnType<typeof mock>).mockClear();
			await tracker.disconnect("u1");
			await flush();

			const msgs = presenceMessages(ws2);
			expect(msgs.length).toBeGreaterThanOrEqual(1);
			expect(msgs[msgs.length - 1].online).toBe(1);
		});

		it("unknown userId → no-op, no broadcast", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);
			await flush();

			(ws.send as ReturnType<typeof mock>).mockClear();
			await tracker.disconnect("unknown");
			await flush();

			expect(presenceMessages(ws)).toHaveLength(0);
		});

		it("last player → counts all 0", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);
			await tracker.disconnect("u1");
			const counts = await tracker.getPresenceCounts();
			expect(counts).toEqual({ online: 0, queuing: 0, inGame: 0 });
		});
	});

	describe("setStatus()", () => {
		it("HSET with new status", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);
			await tracker.setStatus("u1", "queuing");
			expect(redis.hset).toHaveBeenCalledWith(
				"presence:status",
				"u1",
				"queuing",
			);
		});

		it("broadcast triggered", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);
			await flush();
			(ws.send as ReturnType<typeof mock>).mockClear();

			await tracker.setStatus("u1", "queuing");
			await flush();

			const msgs = presenceMessages(ws);
			expect(msgs.length).toBeGreaterThanOrEqual(1);
			expect(msgs[msgs.length - 1].queuing).toBe(1);
		});

		it("transitions online→queuing→in_game→online → counts correct", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);

			await tracker.setStatus("u1", "queuing");
			expect(await tracker.getStatus("u1")).toBe("queuing");

			await tracker.setStatus("u1", "in_game");
			expect(await tracker.getStatus("u1")).toBe("in_game");

			await tracker.setStatus("u1", "online");
			expect(await tracker.getStatus("u1")).toBe("online");
		});

		it("unknown userId → no-op", async () => {
			await tracker.setStatus("unknown", "queuing");
			expect(await tracker.getStatus("unknown")).toBeNull();
		});
	});

	describe("getPresenceCounts()", () => {
		it("parse HVALS correctly", async () => {
			const ws1 = createWs();
			const ws2 = createWs();
			const ws3 = createWs();
			await tracker.connect("u1", "Alice", ws1);
			await tracker.connect("u2", "Bob", ws2);
			await tracker.connect("u3", "Charlie", ws3);

			await tracker.setStatus("u2", "queuing");
			await tracker.setStatus("u3", "in_game");

			const counts = await tracker.getPresenceCounts();
			expect(counts).toEqual({ online: 1, queuing: 1, inGame: 1 });
		});
	});

	describe("broadcastPresence() debounce", () => {
		it("sends presence_update to all sockets", async () => {
			const ws1 = createWs();
			const ws2 = createWs();
			await tracker.connect("u1", "Alice", ws1);
			await tracker.connect("u2", "Bob", ws2);
			await flush();

			const msgs1 = presenceMessages(ws1);
			const msgs2 = presenceMessages(ws2);
			expect(msgs1.length).toBeGreaterThanOrEqual(1);
			expect(msgs2.length).toBeGreaterThanOrEqual(1);
		});

		it("ws.send that throws → no crash, others receive", async () => {
			const ws1 = createWs();
			const ws2 = createWs();
			(ws1.send as ReturnType<typeof mock>).mockImplementation(() => {
				throw new Error("connection closed");
			});

			await tracker.connect("u1", "Alice", ws1);
			await tracker.connect("u2", "Bob", ws2);
			await flush();

			const msgs2 = presenceMessages(ws2);
			expect(msgs2.length).toBeGreaterThanOrEqual(1);
		});

		it("3 rapid calls → only 1 broadcast", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);
			await flush();
			(ws.send as ReturnType<typeof mock>).mockClear();

			// 3 rapid setStatus calls — debounce should collapse to 1 broadcast
			await tracker.setStatus("u1", "queuing");
			await tracker.setStatus("u1", "in_game");
			await tracker.setStatus("u1", "online");

			await flush();
			const msgs = presenceMessages(ws);
			expect(msgs).toHaveLength(1);
		});
	});

	describe("cleanup()", () => {
		it("DEL presence:status + presence:names called", async () => {
			const ws = createWs();
			await tracker.connect("u1", "Alice", ws);
			await tracker.cleanup();
			expect(redis.del).toHaveBeenCalledWith("presence:status");
			expect(redis.del).toHaveBeenCalledWith("presence:names");
		});
	});
});
