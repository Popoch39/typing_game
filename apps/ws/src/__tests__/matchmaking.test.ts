import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Matchmaking } from "../matchmaking";
import type { Player } from "../types";

// Suppress logger output
spyOn(console, "log").mockImplementation(() => {});
spyOn(console, "error").mockImplementation(() => {});

function createPlayer(id: string, name: string): Player {
	return {
		ws: { send: mock(() => {}), close: mock(() => {}) },
		userId: id,
		name,
	};
}

function sent(player: Player): any[] {
	return (player.ws.send as ReturnType<typeof mock>).mock.calls.map(
		(c: unknown[]) => JSON.parse(c[0] as string),
	);
}

function sentOfType(player: Player, type: string): any[] {
	return sent(player).filter((m: any) => m.type === type);
}

describe("Matchmaking", () => {
	let mm: Matchmaking;

	beforeEach(() => {
		mm = new Matchmaking();
	});

	describe("joinQueue", () => {
		it("sends queue_joined with position", () => {
			const p = createPlayer("p1", "Alice");
			mm.joinQueue(p, 30);
			expect(sentOfType(p, "queue_joined")).toHaveLength(1);
			expect(sentOfType(p, "queue_joined")[0].position).toBe(1);
		});

		it("matches 2 players with same duration", () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			mm.joinQueue(p1, 30);
			mm.joinQueue(p2, 30);

			expect(sentOfType(p1, "match_found")).toHaveLength(1);
			expect(sentOfType(p2, "match_found")).toHaveLength(1);
		});

		it("does not match players with different durations", () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			mm.joinQueue(p1, 30);
			mm.joinQueue(p2, 60);

			expect(sentOfType(p1, "match_found")).toHaveLength(0);
			expect(sentOfType(p2, "match_found")).toHaveLength(0);
		});

		it("removes player from previous queue before joining new one", () => {
			const p = createPlayer("p1", "Alice");
			mm.joinQueue(p, 30);
			mm.joinQueue(p, 60);

			const p2 = createPlayer("p2", "Bob");
			mm.joinQueue(p2, 30);
			expect(sentOfType(p2, "match_found")).toHaveLength(0);
		});
	});

	describe("leaveQueue", () => {
		it("removes player from queue", () => {
			const p1 = createPlayer("p1", "Alice");
			mm.joinQueue(p1, 30);
			mm.leaveQueue("p1");

			const p2 = createPlayer("p2", "Bob");
			mm.joinQueue(p2, 30);
			expect(sentOfType(p2, "match_found")).toHaveLength(0);
		});

		it("does nothing for unknown userId", () => {
			mm.leaveQueue("unknown");
		});
	});

	describe("createRoom", () => {
		it("creates room and sends room_created with code", () => {
			const p = createPlayer("p1", "Alice");
			const code = mm.createRoom(p, 30);

			expect(typeof code).toBe("string");
			expect(code.length).toBe(6);
			expect(sentOfType(p, "room_created")).toHaveLength(1);
			expect(sentOfType(p, "room_created")[0].code).toBe(code);
		});

		it("tracks player in room", () => {
			const p = createPlayer("p1", "Alice");
			mm.createRoom(p, 30);
			expect(mm.getPlayerRoom("p1")).toBeDefined();
		});
	});

	describe("joinRoom", () => {
		it("joins an existing room by code", () => {
			const p1 = createPlayer("p1", "Alice");
			const code = mm.createRoom(p1, 30);

			const p2 = createPlayer("p2", "Bob");
			expect(mm.joinRoom(p2, code)).toBe(true);

			expect(sentOfType(p1, "match_found")).toHaveLength(1);
			expect(sentOfType(p2, "match_found")).toHaveLength(1);
		});

		it("sends error for invalid code", () => {
			const p = createPlayer("p1", "Alice");
			expect(mm.joinRoom(p, "XXXXXX")).toBe(false);
			expect(sentOfType(p, "error")).toHaveLength(1);
			expect(sentOfType(p, "error")[0].message).toBe("Room not found");
		});

		it("sends error when room is full", () => {
			const p1 = createPlayer("p1", "Alice");
			const code = mm.createRoom(p1, 30);

			const p2 = createPlayer("p2", "Bob");
			mm.joinRoom(p2, code);

			const p3 = createPlayer("p3", "Charlie");
			expect(mm.joinRoom(p3, code)).toBe(false);
			expect(sentOfType(p3, "error")).toHaveLength(1);
		});

		it("is case-insensitive for code", () => {
			const p1 = createPlayer("p1", "Alice");
			const code = mm.createRoom(p1, 30);

			const p2 = createPlayer("p2", "Bob");
			expect(mm.joinRoom(p2, code.toLowerCase())).toBe(true);
		});
	});

	describe("handleDisconnect", () => {
		it("removes player from queue", () => {
			const p1 = createPlayer("p1", "Alice");
			mm.joinQueue(p1, 30);
			mm.handleDisconnect("p1");

			const p2 = createPlayer("p2", "Bob");
			mm.joinQueue(p2, 30);
			expect(sentOfType(p2, "match_found")).toHaveLength(0);
		});

		it("handles disconnect from room", () => {
			const p1 = createPlayer("p1", "Alice");
			mm.createRoom(p1, 30);
			mm.handleDisconnect("p1");
			expect(mm.getPlayerRoom("p1")).toBeUndefined();
		});

		it("does nothing for unknown userId", () => {
			mm.handleDisconnect("unknown");
		});
	});

	describe("handleMessage", () => {
		it("routes keystroke to room", async () => {
			const p1 = createPlayer("p1", "Alice");
			const code = mm.createRoom(p1, 30);
			const p2 = createPlayer("p2", "Bob");
			mm.joinRoom(p2, code);

			// Wait for countdown
			await new Promise((r) => setTimeout(r, 3200));

			mm.handleMessage("p1", { type: "keystroke", key: "char", char: "a" });
			expect(sentOfType(p1, "self_stats").length).toBeGreaterThan(0);
		}, 10_000);

		it("does nothing if player has no room", () => {
			mm.handleMessage("unknown", {
				type: "keystroke",
				key: "char",
				char: "a",
			});
		});

		it("does nothing for non-keystroke message types", () => {
			const p1 = createPlayer("p1", "Alice");
			mm.createRoom(p1, 30);
			mm.handleMessage("p1", { type: "unknown_type" });
			expect(sentOfType(p1, "self_stats")).toHaveLength(0);
		});
	});

	describe("getPlayerRoom", () => {
		it("returns undefined for unknown player", () => {
			expect(mm.getPlayerRoom("unknown")).toBeUndefined();
		});

		it("returns roomId for player in room", () => {
			const p = createPlayer("p1", "Alice");
			mm.createRoom(p, 30);
			expect(mm.getPlayerRoom("p1")).toBeDefined();
		});
	});

	describe("getSnapshot", () => {
		it("returns empty snapshot initially", () => {
			const snap = mm.getSnapshot();
			expect(snap.rooms).toEqual([]);
			expect(snap.queues).toEqual([]);
		});

		it("includes rooms in snapshot", () => {
			const p = createPlayer("p1", "Alice");
			mm.createRoom(p, 30);
			const snap = mm.getSnapshot();
			expect(snap.rooms).toHaveLength(1);
			expect(snap.rooms[0]!.state).toBe("waiting");
		});

		it("includes queues in snapshot", () => {
			const p = createPlayer("p1", "Alice");
			mm.joinQueue(p, 30);
			const snap = mm.getSnapshot();
			expect(snap.queues).toHaveLength(1);
			expect(snap.queues[0]!.duration).toBe(30);
			expect(snap.queues[0]!.count).toBe(1);
		});

		it("excludes empty queues from snapshot", () => {
			const p = createPlayer("p1", "Alice");
			mm.joinQueue(p, 30);
			mm.leaveQueue("p1");
			const snap = mm.getSnapshot();
			expect(snap.queues).toEqual([]);
		});
	});
});
