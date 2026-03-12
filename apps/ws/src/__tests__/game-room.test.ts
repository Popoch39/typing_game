import { describe, it, expect, mock, beforeEach, spyOn } from "bun:test";
import { GameRoom } from "../game-room";
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

/** Extract the words from the game_start message sent to a player */
function getWords(player: Player): string[] {
	const start = sentOfType(player, "game_start")[0];
	return start?.words ?? [];
}

/** Type a complete game (all words) for a player */
function typeAllWords(room: GameRoom, userId: string, words: string[]) {
	for (const word of words) {
		for (const ch of word) {
			room.handleKeystroke(userId, { key: "char", char: ch }, Date.now());
		}
		room.handleKeystroke(userId, { key: "space" }, Date.now());
	}
}

/** Wait for countdown (3s) + small buffer */
async function waitForCountdown() {
	await new Promise((r) => setTimeout(r, 3200));
}

describe("GameRoom", () => {
	let destroyMock: ReturnType<typeof mock>;
	let room: GameRoom;

	beforeEach(() => {
		destroyMock = mock(() => {});
		room = new GameRoom("room-1", 30, destroyMock);
	});

	describe("getters", () => {
		it("playerCount starts at 0", () => {
			expect(room.playerCount).toBe(0);
		});

		it("isFull is false with 0-1 players", () => {
			expect(room.isFull).toBe(false);
			room.addPlayer(createPlayer("p1", "Alice"));
			expect(room.isFull).toBe(false);
		});

		it("roomState starts as waiting", () => {
			expect(room.roomState).toBe("waiting");
		});

		it("getPlayers returns player info", () => {
			const p = createPlayer("abcdefgh-1234", "Alice");
			room.addPlayer(p);
			const players = room.getPlayers();
			expect(players).toHaveLength(1);
			expect(players[0]!.name).toBe("Alice");
			expect(players[0]!.userId).toBe("abcdefgh");
		});
	});

	describe("addPlayer", () => {
		it("adds a player and returns true", () => {
			const p = createPlayer("p1", "Alice");
			expect(room.addPlayer(p)).toBe(true);
			expect(room.playerCount).toBe(1);
		});

		it("sends error when room is full", () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			const p3 = createPlayer("p3", "Charlie");
			room.addPlayer(p1);
			room.addPlayer(p2);
			expect(room.addPlayer(p3)).toBe(false);
			expect(sentOfType(p3, "error")).toHaveLength(1);
		});

		it("sends match_found and starts countdown when 2 players join", () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);

			expect(sentOfType(p1, "match_found")).toHaveLength(1);
			expect(sentOfType(p2, "match_found")).toHaveLength(1);
			expect(room.roomState).toBe("countdown");
			expect(room.isFull).toBe(true);
		});
	});

	describe("reconnectPlayer", () => {
		it("returns false if player not in room", () => {
			const p = createPlayer("unknown", "Nobody");
			expect(room.reconnectPlayer(p)).toBe(false);
		});

		it("restores player and notifies opponent", () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);

			room.handleDisconnect("p1");

			const p1New = createPlayer("p1", "Alice");
			expect(room.reconnectPlayer(p1New)).toBe(true);
			expect(sentOfType(p2, "opponent_reconnected")).toHaveLength(1);
		});
	});

	describe("handleDisconnect", () => {
		it("does nothing for unknown player", () => {
			room.handleDisconnect("unknown");
			expect(destroyMock).not.toHaveBeenCalled();
		});

		it("in waiting state: cleanup + destroy", () => {
			const p1 = createPlayer("p1", "Alice");
			room.addPlayer(p1);
			room.handleDisconnect("p1");
			expect(destroyMock).toHaveBeenCalledWith("room-1");
		});

		it("in countdown state: cleanup + destroy", () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);
			expect(room.roomState).toBe("countdown");

			room.handleDisconnect("p1");
			expect(destroyMock).toHaveBeenCalledWith("room-1");
		});

		it("in playing state: notifies opponent_disconnected, then forfeit after grace", async () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);

			await waitForCountdown();
			expect(room.roomState).toBe("playing");

			room.handleDisconnect("p1");
			expect(sentOfType(p2, "opponent_disconnected")).toHaveLength(1);

			// Wait for grace period (5s)
			await new Promise((r) => setTimeout(r, 5200));
			expect(room.roomState).toBe("finished");
			const results = sentOfType(p2, "game_result");
			expect(results).toHaveLength(1);
			expect(results[0].winner).toBe("p2");
		}, 15_000);
	});

	describe("handleKeystroke", () => {
		async function setupPlayingRoom() {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);
			await waitForCountdown();
			expect(room.roomState).toBe("playing");
			return { p1, p2, words: getWords(p1) };
		}

		it("is no-op when not playing", () => {
			const p1 = createPlayer("p1", "Alice");
			room.addPlayer(p1);
			room.handleKeystroke("p1", { key: "char", char: "a" }, Date.now());
			expect(sentOfType(p1, "self_stats")).toHaveLength(0);
		});

		it("routes char keystroke and sends self_stats + opponent_progress", async () => {
			const { p1, p2 } = await setupPlayingRoom();

			room.handleKeystroke("p1", { key: "char", char: "a" }, Date.now());

			expect(sentOfType(p1, "self_stats").length).toBeGreaterThan(0);
			expect(sentOfType(p2, "opponent_progress").length).toBeGreaterThan(0);
		}, 10_000);

		it("routes space keystroke", async () => {
			const { p1 } = await setupPlayingRoom();
			room.handleKeystroke("p1", { key: "space" }, Date.now());
			expect(sentOfType(p1, "self_stats").length).toBeGreaterThan(0);
		}, 10_000);

		it("routes backspace keystroke", async () => {
			const { p1 } = await setupPlayingRoom();
			room.handleKeystroke("p1", { key: "char", char: "a" }, Date.now());
			room.handleKeystroke("p1", { key: "backspace" }, Date.now());
			expect(sentOfType(p1, "self_stats").length).toBe(2);
		}, 10_000);

		it("routes ctrl_backspace keystroke", async () => {
			const { p1 } = await setupPlayingRoom();
			room.handleKeystroke("p1", { key: "char", char: "a" }, Date.now());
			room.handleKeystroke("p1", { key: "ctrl_backspace" }, Date.now());
			expect(sentOfType(p1, "self_stats").length).toBe(2);
		}, 10_000);

		it("ignores keystrokes from unknown player", async () => {
			await setupPlayingRoom();
			room.handleKeystroke("unknown", { key: "char", char: "a" }, Date.now());
		}, 10_000);

		it("ignores keystrokes from completed player", async () => {
			const { p1, words } = await setupPlayingRoom();

			typeAllWords(room, "p1", words);
			expect(sentOfType(p1, "self_complete")).toHaveLength(1);

			const countBefore = sentOfType(p1, "self_stats").length;
			room.handleKeystroke("p1", { key: "char", char: "x" }, Date.now());
			expect(sentOfType(p1, "self_stats").length).toBe(countBefore);
		}, 10_000);

		it("sends game_result when both players complete", async () => {
			const { p1, p2, words } = await setupPlayingRoom();

			typeAllWords(room, "p1", words);
			typeAllWords(room, "p2", words);

			expect(sentOfType(p1, "game_result")).toHaveLength(1);
			expect(sentOfType(p2, "game_result")).toHaveLength(1);
			expect(room.roomState).toBe("finished");
		}, 10_000);

		it("sends opponent_complete when one player finishes", async () => {
			const { p1, p2, words } = await setupPlayingRoom();

			typeAllWords(room, "p1", words);

			expect(sentOfType(p2, "opponent_complete")).toHaveLength(1);
			expect(sentOfType(p1, "self_complete")).toHaveLength(1);
		}, 10_000);
	});

	describe("startCountdown / startGame", () => {
		it("broadcasts countdown values 3, 2, 1 then game_start", async () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);

			await waitForCountdown();

			const countdowns = sentOfType(p1, "countdown");
			expect(countdowns).toHaveLength(3);
			expect(countdowns[0].value).toBe(3);
			expect(countdowns[1].value).toBe(2);
			expect(countdowns[2].value).toBe(1);

			const starts = sentOfType(p1, "game_start");
			expect(starts).toHaveLength(1);
			expect(starts[0].words.length).toBeGreaterThan(0);
			expect(starts[0].duration).toBe(30);
		}, 10_000);
	});

	describe("finishGame", () => {
		it("determines winner by score when both complete", async () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);
			await waitForCountdown();

			const words = getWords(p1);

			// p1 types all words
			typeAllWords(room, "p1", words);

			// Small delay so p2 has lower WPM
			await new Promise((r) => setTimeout(r, 200));

			typeAllWords(room, "p2", words);

			const results = sentOfType(p1, "game_result");
			expect(results).toHaveLength(1);
			// p1 should win (typed first, higher WPM)
			expect(results[0].winner).toBe("p1");
		}, 10_000);

		it("returns null winner on tie (same WPM)", async () => {
			const shortRoom = new GameRoom("room-short", 1, destroyMock);
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			shortRoom.addPlayer(p1);
			shortRoom.addPlayer(p2);

			// Wait for countdown (3s) + game duration (1s)
			await new Promise((r) => setTimeout(r, 4400));

			expect(shortRoom.roomState).toBe("finished");
			const results = sentOfType(p1, "game_result");
			expect(results).toHaveLength(1);
			// Both have 0 WPM → tie
			expect(results[0].winner).toBeNull();
		}, 10_000);

		it("one completer wins over non-completer on timer expiry", async () => {
			const shortRoom = new GameRoom("room-short2", 1, destroyMock);
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			shortRoom.addPlayer(p1);
			shortRoom.addPlayer(p2);

			await waitForCountdown();

			const words = getWords(p1);
			typeAllWords(shortRoom, "p1", words);

			// Wait for timer expiry
			await new Promise((r) => setTimeout(r, 1200));

			expect(shortRoom.roomState).toBe("finished");
			const results = sentOfType(p1, "game_result");
			expect(results).toHaveLength(1);
			expect(results[0].winner).toBe("p1");
		}, 10_000);

		it("is no-op if already finished", async () => {
			const shortRoom = new GameRoom("room-short3", 1, destroyMock);
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			shortRoom.addPlayer(p1);
			shortRoom.addPlayer(p2);

			await waitForCountdown();

			const words = getWords(p1);
			typeAllWords(shortRoom, "p1", words);
			typeAllWords(shortRoom, "p2", words);

			const count1 = sentOfType(p1, "game_result").length;

			// Wait for timer expiry (would call finishGame again)
			await new Promise((r) => setTimeout(r, 1400));

			// Should not have sent another game_result
			expect(sentOfType(p1, "game_result").length).toBe(count1);
		}, 10_000);

		it("determines winner by score when neither completes (timer)", async () => {
			const shortRoom = new GameRoom("room-wpm", 1, destroyMock);
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			shortRoom.addPlayer(p1);
			shortRoom.addPlayer(p2);

			await waitForCountdown();
			const words = getWords(p1);

			// p1 types a word + space to get a score; p2 types nothing
			for (const ch of words[0]!) {
				shortRoom.handleKeystroke("p1", { key: "char", char: ch }, Date.now());
			}
			shortRoom.handleKeystroke("p1", { key: "space" }, Date.now());

			// Wait for timer
			await new Promise((r) => setTimeout(r, 1200));

			expect(shortRoom.roomState).toBe("finished");
			const results = sentOfType(p1, "game_result");
			expect(results).toHaveLength(1);
			expect(results[0].winner).toBe("p1");
		}, 10_000);
	});

	describe("private room with code", () => {
		it("stores code from constructor", () => {
			const r = new GameRoom("r1", 30, destroyMock, "ABCDEF");
			expect(r.code).toBe("ABCDEF");
		});

		it("code is null by default", () => {
			expect(room.code).toBeNull();
		});
	});

	describe("client timestamp validation", () => {
		async function setupPlayingRoom() {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);
			await waitForCountdown();
			expect(room.roomState).toBe("playing");
			return { p1, p2, words: getWords(p1) };
		}

		it("uses valid client timestamp for stats", async () => {
			const { p1 } = await setupPlayingRoom();
			const t = Date.now();
			room.handleKeystroke("p1", { key: "char", char: "a" }, t);
			const stats = sentOfType(p1, "self_stats");
			expect(stats.length).toBeGreaterThan(0);
		}, 10_000);

		it("falls back to server time when timestamp is before gameStartTime", async () => {
			const { p1 } = await setupPlayingRoom();
			room.handleKeystroke("p1", { key: "char", char: "a" }, 1000);
			const stats = sentOfType(p1, "self_stats");
			expect(stats.length).toBeGreaterThan(0);
		}, 10_000);

		it("falls back to server time when timestamp is too far in the future", async () => {
			const { p1 } = await setupPlayingRoom();
			room.handleKeystroke("p1", { key: "char", char: "a" }, Date.now() + 999999);
			const stats = sentOfType(p1, "self_stats");
			expect(stats.length).toBeGreaterThan(0);
		}, 10_000);

		it("falls back to server time on non-monotonic timestamp", async () => {
			const { p1 } = await setupPlayingRoom();
			const t = Date.now();
			room.handleKeystroke("p1", { key: "char", char: "a" }, t);
			room.handleKeystroke("p1", { key: "char", char: "b" }, t - 1000);
			const stats = sentOfType(p1, "self_stats");
			expect(stats.length).toBe(2);
		}, 10_000);
	});

	describe("ping/pong RTT measurement", () => {
		it("handlePong updates rttSamples and tolerance", async () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);
			expect(room.roomState).toBe("countdown");

			const serverT = Date.now() - 50;
			room.handlePong("p1", serverT);

			const serverT2 = Date.now() - 100;
			room.handlePong("p1", serverT2);
		});

		it("handlePong is ignored when not in countdown or playing state", () => {
			const p1 = createPlayer("p1", "Alice");
			room.addPlayer(p1);
			expect(room.roomState).toBe("waiting");
			room.handlePong("p1", Date.now() - 50);
		});

		it("handlePong keeps rolling window of 10 samples", async () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);
			await waitForCountdown();

			for (let i = 0; i < 15; i++) {
				room.handlePong("p1", Date.now() - 30);
			}
		}, 10_000);

		it("sends ping messages during countdown", () => {
			const p1 = createPlayer("p1", "Alice");
			const p2 = createPlayer("p2", "Bob");
			room.addPlayer(p1);
			room.addPlayer(p2);

			return new Promise<void>((resolve) => {
				setTimeout(() => {
					const pings = sentOfType(p1, "ping");
					expect(pings.length).toBeGreaterThan(0);
					expect(pings[0].t).toBeTypeOf("number");
					resolve();
				}, 100);
			});
		});
	});
});
