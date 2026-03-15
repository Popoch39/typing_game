import { describe, it, expect, mock, beforeEach, spyOn } from "bun:test";
import { Matchmaking } from "../matchmaking";
import { PresenceTracker } from "../presence";
import type { Player } from "../types";

// Suppress logger output
spyOn(console, "log").mockImplementation(() => {});
spyOn(console, "error").mockImplementation(() => {});

// --- Mock Redis ---

function createMockRedis() {
	const hashes = new Map<string, Map<string, string>>();
	const sortedSets = new Map<string, Map<string, number>>();

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
		_hashes: hashes,
	};
}

function createPlayer(id: string, name: string): Player {
	return {
		ws: { send: mock(() => {}), close: mock(() => {}) },
		userId: id,
		name,
	};
}

describe("Matchmaking + Presence integration", () => {
	let redis: ReturnType<typeof createMockRedis>;
	let presence: PresenceTracker;
	let mm: Matchmaking;

	beforeEach(() => {
		redis = createMockRedis();
		presence = new PresenceTracker(redis as any);
		mm = new Matchmaking(presence);
	});

	it("joinQueue sets status to queuing", async () => {
		const p = createPlayer("p1", "Alice");
		await presence.connect("p1", "Alice", p.ws);
		mm.joinQueue(p, 30);
		await new Promise((r) => setTimeout(r, 10));
		expect(await presence.getStatus("p1")).toBe("queuing");
	});

	it("leaveQueue sets status back to online", async () => {
		const p = createPlayer("p1", "Alice");
		await presence.connect("p1", "Alice", p.ws);
		mm.joinQueue(p, 30);
		mm.leaveQueue("p1");
		// setStatus is fire-and-forget, give it a tick
		await new Promise((r) => setTimeout(r, 10));
		expect(await presence.getStatus("p1")).toBe("online");
	});

	it("match found sets both players to in_game", async () => {
		const p1 = createPlayer("p1", "Alice");
		const p2 = createPlayer("p2", "Bob");
		await presence.connect("p1", "Alice", p1.ws);
		await presence.connect("p2", "Bob", p2.ws);

		mm.joinQueue(p1, 30);
		mm.joinQueue(p2, 30);

		// setStatus is fire-and-forget
		await new Promise((r) => setTimeout(r, 10));
		expect(await presence.getStatus("p1")).toBe("in_game");
		expect(await presence.getStatus("p2")).toBe("in_game");
	});

	it("game finish (room destroy) sets players back to online", async () => {
		const p1 = createPlayer("p1", "Alice");
		const p2 = createPlayer("p2", "Bob");
		await presence.connect("p1", "Alice", p1.ws);
		await presence.connect("p2", "Bob", p2.ws);

		mm.joinQueue(p1, 30);
		mm.joinQueue(p2, 30);

		// Wait for countdown + start
		await new Promise((r) => setTimeout(r, 3200));

		// Disconnect p1 → triggers disconnect timeout → game finishes → room destroyed
		mm.handleDisconnect("p1");
		await new Promise((r) => setTimeout(r, 5500));

		// After room destroy, p2 should be back to online
		expect(await presence.getStatus("p2")).toBe("online");
	}, 15_000);

	it("createRoom sets player to in_game", async () => {
		const p = createPlayer("p1", "Alice");
		await presence.connect("p1", "Alice", p.ws);
		mm.createRoom(p, 30);
		await new Promise((r) => setTimeout(r, 10));
		expect(await presence.getStatus("p1")).toBe("in_game");
	});

	it("joinRoom sets player to in_game", async () => {
		const p1 = createPlayer("p1", "Alice");
		const p2 = createPlayer("p2", "Bob");
		await presence.connect("p1", "Alice", p1.ws);
		await presence.connect("p2", "Bob", p2.ws);

		const code = mm.createRoom(p1, 30);
		mm.joinRoom(p2, code);

		await new Promise((r) => setTimeout(r, 10));
		expect(await presence.getStatus("p1")).toBe("in_game");
		expect(await presence.getStatus("p2")).toBe("in_game");
	});

	it("joinQueue broadcasts presence_update with queuing incremented", async () => {
		const p = createPlayer("p1", "Alice");
		await presence.connect("p1", "Alice", p.ws);
		mm.joinQueue(p, 30);

		// Wait for debounce
		await new Promise((r) => setTimeout(r, 200));

		const msgs = (p.ws.send as ReturnType<typeof mock>).mock.calls
			.map((c: unknown[]) => JSON.parse(c[0] as string))
			.filter((m: any) => m.type === "presence_update");
		const last = msgs[msgs.length - 1];
		expect(last.queuing).toBe(1);
	});

	it("match broadcasts presence_update with inGame incremented", async () => {
		const p1 = createPlayer("p1", "Alice");
		const p2 = createPlayer("p2", "Bob");
		await presence.connect("p1", "Alice", p1.ws);
		await presence.connect("p2", "Bob", p2.ws);

		mm.joinQueue(p1, 30);
		mm.joinQueue(p2, 30);

		// Wait for debounce
		await new Promise((r) => setTimeout(r, 200));

		const msgs = (p1.ws.send as ReturnType<typeof mock>).mock.calls
			.map((c: unknown[]) => JSON.parse(c[0] as string))
			.filter((m: any) => m.type === "presence_update");
		const last = msgs[msgs.length - 1];
		expect(last.inGame).toBe(2);
	});
});
