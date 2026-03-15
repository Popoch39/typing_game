import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	MultiplayerClient,
	type MultiplayerState,
	type WebSocketFactory,
} from "../multiplayer-client";

// --- Mock WebSocket ---

class MockWebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;

	readonly CONNECTING = 0;
	readonly OPEN = 1;
	readonly CLOSING = 2;
	readonly CLOSED = 3;

	readyState = MockWebSocket.CONNECTING;
	url: string;
	sent: string[] = [];

	onopen: ((ev: Event) => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onclose: ((ev: CloseEvent) => void) | null = null;

	close = vi.fn(() => {
		this.readyState = MockWebSocket.CLOSED;
	});

	send = vi.fn((data: string) => {
		this.sent.push(data);
	});

	constructor(url: string) {
		this.url = url;
	}

	// Test helpers
	simulateOpen() {
		this.readyState = MockWebSocket.OPEN;
		this.onopen?.(new Event("open"));
	}

	simulateMessage(data: unknown) {
		this.onmessage?.(
			new MessageEvent("message", { data: JSON.stringify(data) }),
		);
	}

	simulateClose() {
		this.readyState = MockWebSocket.CLOSED;
		this.onclose?.({} as CloseEvent);
	}
}

// --- Helpers ---

function createClient() {
	const onStateChange = vi.fn<[MultiplayerState], void>();
	let lastWs: MockWebSocket | null = null;
	const wsFactory: WebSocketFactory = (url: string) => {
		lastWs = new MockWebSocket(url);
		return lastWs as unknown as WebSocket;
	};

	const client = new MultiplayerClient({ onStateChange }, wsFactory);

	return {
		client,
		onStateChange,
		getWs: () => lastWs!,
		wsFactory,
	};
}

function lastState(onStateChange: ReturnType<typeof vi.fn>) {
	return onStateChange.mock.calls.at(-1)?.[0] as MultiplayerState;
}

// --- Tests ---

describe("MultiplayerClient", () => {
	beforeEach(() => {
		vi.stubEnv("NEXT_PUBLIC_WS_URL", "ws://test:3002");
	});

	describe("constructor & getState", () => {
		it("initializes with idle state", () => {
			const { client } = createClient();
			const state = client.getState();
			expect(state.status).toBe("idle");
			expect(state.roomCode).toBeNull();
			expect(state.opponent).toBeNull();
			expect(state.gameWords).toBeNull();
			expect(state.gameResult).toBeNull();
			expect(state.error).toBeNull();
			expect(state.opponentDisconnected).toBe(false);
		});
	});

	describe("connect/disconnect lifecycle", () => {
		it("transitions to connecting then idle on open", () => {
			const { client, onStateChange, getWs } = createClient();
			client.connect("token123");

			expect(getWs().url).toBe("ws://test:3002/ws?token=token123");
			expect(lastState(onStateChange).status).toBe("connecting");

			getWs().simulateOpen();
			expect(lastState(onStateChange).status).toBe("idle");
		});

		it("disconnect resets state and fires callback", () => {
			const { client, onStateChange, getWs } = createClient();
			client.connect("t");
			getWs().simulateOpen();
			getWs().simulateMessage({ type: "queue_joined", position: 1 });

			expect(lastState(onStateChange).status).toBe("queuing");

			client.disconnect();
			const state = lastState(onStateChange);
			expect(state.status).toBe("idle");
			expect(state.roomCode).toBeNull();
			expect(getWs().close).toHaveBeenCalled();
		});

		it("destroy is an alias for disconnect", () => {
			const { client, onStateChange, getWs } = createClient();
			client.connect("t");
			getWs().simulateOpen();

			client.destroy();
			expect(lastState(onStateChange).status).toBe("idle");
			expect(getWs().close).toHaveBeenCalled();
		});

		it("onclose clears ws ref (subsequent sends are no-ops)", () => {
			const { client, getWs } = createClient();
			client.connect("t");
			getWs().simulateOpen();
			getWs().simulateClose();

			// Should not throw, just no-op
			client.joinQueue(30);
		});

		it("handles multiple connect calls (strict mode safety)", () => {
			const { client, getWs } = createClient();
			client.connect("t1");
			const ws1 = getWs();
			ws1.simulateOpen();

			client.connect("t2");
			const ws2 = getWs();
			expect(ws1.close).toHaveBeenCalled();
			expect(ws2).not.toBe(ws1);
		});

		it("old ws events are ignored after reconnect", () => {
			const { client, onStateChange, getWs } = createClient();
			client.connect("t1");
			const ws1 = getWs();
			ws1.simulateOpen();

			client.connect("t2");
			const ws2 = getWs();
			ws2.simulateOpen();

			// Old ws1 message should be ignored (onmessage was nulled)
			// ws1.onmessage is null after connect() clears handlers
			expect(ws1.onmessage).toBeNull();
		});
	});

	describe("server message handling", () => {
		function connectedClient() {
			const ctx = createClient();
			ctx.client.connect("t");
			ctx.getWs().simulateOpen();
			ctx.onStateChange.mockClear();
			return ctx;
		}

		it("queue_joined → queuing", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({ type: "queue_joined", position: 1 });
			expect(lastState(onStateChange).status).toBe("queuing");
		});

		it("room_created → in_room with code", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({ type: "room_created", code: "ABC123" });
			const state = lastState(onStateChange);
			expect(state.status).toBe("in_room");
			expect(state.roomCode).toBe("ABC123");
		});

		it("room_joined → in_room with opponent", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({ type: "room_joined", opponent: "Alice" });
			const state = lastState(onStateChange);
			expect(state.status).toBe("in_room");
			expect(state.opponent?.name).toBe("Alice");
			expect(state.opponent?.completed).toBe(false);
		});

		it("match_found → countdown with opponent", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({
				type: "match_found",
				opponent: "Bob",
				roomId: "r1",
			});
			const state = lastState(onStateChange);
			expect(state.status).toBe("countdown");
			expect(state.opponent?.name).toBe("Bob");
		});

		it("countdown → countdown with value", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({ type: "countdown", value: 3 });
			const state = lastState(onStateChange);
			expect(state.status).toBe("countdown");
			expect(state.countdownValue).toBe(3);
		});

		it("game_start → playing with words and duration", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({
				type: "game_start",
				words: ["hello", "world"],
				duration: 30,
				startTime: 1000,
			});
			const state = lastState(onStateChange);
			expect(state.status).toBe("playing");
			expect(state.gameWords).toEqual(["hello", "world"]);
			expect(state.gameDuration).toBe(30);
			expect(state.gameStartTime).toBe(1000);
			expect(state.selfStats).toBeNull();
			expect(state.selfComplete).toBe(false);
		});

		it("self_stats → updates selfStats", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({
				type: "self_stats",
				wpm: 50,
				rawWpm: 55,
				accuracy: 97,
				wordIndex: 3,
				charIndex: 2,
				errors: 2,
			});
			const state = lastState(onStateChange);
			expect(state.selfStats).toEqual({
				wpm: 50,
				rawWpm: 55,
				accuracy: 97,
				wordIndex: 3,
				charIndex: 2,
			});
		});

		it("self_complete → marks selfComplete", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({
				type: "self_complete",
				wpm: 60,
				rawWpm: 65,
				accuracy: 95,
			});
			const state = lastState(onStateChange);
			expect(state.selfComplete).toBe(true);
			expect(state.selfStats?.wpm).toBe(60);
		});

		it("opponent_progress → updates opponent", () => {
			const { getWs, onStateChange } = connectedClient();
			// Set up opponent first
			getWs().simulateMessage({
				type: "match_found",
				opponent: "Bob",
				roomId: "r",
			});
			onStateChange.mockClear();

			getWs().simulateMessage({
				type: "opponent_progress",
				wordIndex: 2,
				charIndex: 3,
				wpm: 45,
				accuracy: 98,
				score: 50,
				combo: 1.0,
				errors: 0,
			});
			const opp = lastState(onStateChange).opponent!;
			expect(opp.name).toBe("Bob");
			expect(opp.wordIndex).toBe(2);
			expect(opp.wpm).toBe(45);
		});

		it("opponent_progress without prior opponent creates placeholder", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({
				type: "opponent_progress",
				wordIndex: 1,
				charIndex: 0,
				wpm: 30,
				accuracy: 100,
				score: 0,
				combo: 1.0,
				errors: 0,
			});
			const opp = lastState(onStateChange).opponent!;
			expect(opp.name).toBe("");
			expect(opp.wordIndex).toBe(1);
		});

		it("opponent_complete → marks opponent completed", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({
				type: "match_found",
				opponent: "Bob",
				roomId: "r",
			});
			onStateChange.mockClear();

			getWs().simulateMessage({
				type: "opponent_complete",
				wpm: 60,
				accuracy: 95,
				rawWpm: 65,
			});
			const opp = lastState(onStateChange).opponent!;
			expect(opp.completed).toBe(true);
			expect(opp.wpm).toBe(60);
			expect(opp.rawWpm).toBe(65);
		});

		it("game_result → finished with result", () => {
			const { getWs, onStateChange } = connectedClient();
			const players = [
				{
					userId: "u1",
					name: "Me",
					wpm: 60,
					accuracy: 95,
					rawWpm: 65,
					completed: true,
				},
			];
			getWs().simulateMessage({
				type: "game_result",
				winner: "u1",
				players,
			});
			const state = lastState(onStateChange);
			expect(state.status).toBe("finished");
			expect(state.gameResult?.winner).toBe("u1");
			expect(state.gameResult?.players).toEqual(players);
		});

		it("opponent_disconnected / reconnected", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({ type: "opponent_disconnected" });
			expect(lastState(onStateChange).opponentDisconnected).toBe(true);

			getWs().simulateMessage({ type: "opponent_reconnected" });
			expect(lastState(onStateChange).opponentDisconnected).toBe(false);
		});

		it("error → sets error string", () => {
			const { getWs, onStateChange } = connectedClient();
			getWs().simulateMessage({ type: "error", message: "Room full" });
			expect(lastState(onStateChange).error).toBe("Room full");
		});

		it("ignores malformed JSON", () => {
			const { getWs, onStateChange } = connectedClient();
			// Directly call onmessage with bad data
			getWs().onmessage?.(new MessageEvent("message", { data: "not json" }));
			expect(onStateChange).not.toHaveBeenCalled();
		});
	});

	describe("client actions send correct messages", () => {
		function readyClient() {
			const ctx = createClient();
			ctx.client.connect("t");
			ctx.getWs().simulateOpen();
			return ctx;
		}

		it("joinQueue sends join_queue", () => {
			const { client, getWs } = readyClient();
			client.joinQueue(30);
			expect(JSON.parse(getWs().sent[0])).toEqual({
				type: "join_queue",
				duration: 30,
			});
		});

		it("leaveQueue sends leave_queue and sets idle", () => {
			const { client, getWs, onStateChange } = readyClient();
			client.leaveQueue();
			expect(JSON.parse(getWs().sent[0])).toEqual({ type: "leave_queue" });
			expect(lastState(onStateChange).status).toBe("idle");
		});

		it("createRoom sends create_room", () => {
			const { client, getWs } = readyClient();
			client.createRoom(60);
			expect(JSON.parse(getWs().sent[0])).toEqual({
				type: "create_room",
				duration: 60,
			});
		});

		it("joinRoom sends join_room", () => {
			const { client, getWs } = readyClient();
			client.joinRoom("ABC");
			expect(JSON.parse(getWs().sent[0])).toEqual({
				type: "join_room",
				code: "ABC",
			});
		});

		it("sendKeystroke sends keystroke char", () => {
			const { client, getWs } = readyClient();
			client.sendKeystroke({ key: "char", char: "a" });
			const msg = JSON.parse(getWs().sent[0]);
			expect(msg).toMatchObject({
				type: "keystroke",
				key: "char",
				char: "a",
			});
			expect(msg.t).toEqual(expect.any(Number));
		});

		it("sendKeystroke sends keystroke space", () => {
			const { client, getWs } = readyClient();
			client.sendKeystroke({ key: "space" });
			const msg = JSON.parse(getWs().sent[0]);
			expect(msg).toMatchObject({
				type: "keystroke",
				key: "space",
			});
			expect(msg.t).toEqual(expect.any(Number));
		});

		it("sendKeystroke sends keystroke backspace", () => {
			const { client, getWs } = readyClient();
			client.sendKeystroke({ key: "backspace" });
			const msg = JSON.parse(getWs().sent[0]);
			expect(msg).toMatchObject({
				type: "keystroke",
				key: "backspace",
			});
			expect(msg.t).toEqual(expect.any(Number));
		});

		it("sendKeystroke sends keystroke ctrl_backspace", () => {
			const { client, getWs } = readyClient();
			client.sendKeystroke({ key: "ctrl_backspace" });
			const msg = JSON.parse(getWs().sent[0]);
			expect(msg).toMatchObject({
				type: "keystroke",
				key: "ctrl_backspace",
			});
			expect(msg.t).toEqual(expect.any(Number));
		});

		it("send is no-op when WS not open", () => {
			const { client, getWs } = readyClient();
			getWs().readyState = MockWebSocket.CLOSED;
			client.joinQueue(30);
			expect(getWs().sent).toHaveLength(0);
		});

		it("send is no-op when not connected", () => {
			const { client } = createClient();
			// No connect() call
			client.joinQueue(30); // should not throw
		});
	});

	describe("score history accumulation", () => {
		function playingClient() {
			const ctx = createClient();
			ctx.client.connect("t");
			ctx.getWs().simulateOpen();
			ctx.getWs().simulateMessage({
				type: "game_start",
				words: ["hello", "world"],
				duration: 30,
				startTime: Date.now(),
			});
			ctx.onStateChange.mockClear();
			return ctx;
		}

		it("records score points from self_stats", () => {
			const { getWs, onStateChange } = playingClient();
			getWs().simulateMessage({
				type: "self_stats",
				wpm: 50,
				rawWpm: 55,
				accuracy: 97,
				wordIndex: 1,
				charIndex: 0,
				timeCorrection: 0,
				score: 100,
				combo: 1.0,
				lastWordScore: 100,
				errors: 2,
			});
			const state = lastState(onStateChange);
			expect(state.scoreHistory.length).toBeGreaterThanOrEqual(1);
			expect(state.scoreHistory[0].selfScore).toBe(100);
			expect(state.scoreHistory[0].oppScore).toBe(0);
			expect(state.scoreHistory[0].selfWpm).toBe(50);
			expect(state.scoreHistory[0].oppWpm).toBe(0);
			expect(state.scoreHistory[0].selfErrors).toBe(2);
		});

		it("records score points from opponent_progress", () => {
			const { getWs, onStateChange } = playingClient();
			getWs().simulateMessage({
				type: "opponent_progress",
				wordIndex: 1,
				charIndex: 0,
				wpm: 40,
				accuracy: 95,
				score: 80,
				combo: 1.0,
				errors: 3,
			});
			const state = lastState(onStateChange);
			expect(state.scoreHistory.length).toBeGreaterThanOrEqual(1);
			expect(state.scoreHistory[0].oppScore).toBe(80);
			expect(state.scoreHistory[0].selfScore).toBe(0);
			expect(state.scoreHistory[0].oppWpm).toBe(40);
			expect(state.scoreHistory[0].selfWpm).toBe(0);
			expect(state.scoreHistory[0].selfErrors).toBe(0);
			expect(state.scoreHistory[0].oppErrors).toBe(3);
		});

		it("throttles to max 1 point per second", () => {
			const { getWs, onStateChange } = playingClient();
			// Send two self_stats in rapid succession (same second)
			getWs().simulateMessage({
				type: "self_stats",
				wpm: 50,
				rawWpm: 55,
				accuracy: 97,
				wordIndex: 1,
				charIndex: 0,
				timeCorrection: 0,
				score: 100,
				combo: 1.0,
				lastWordScore: 100,
				errors: 0,
			});
			getWs().simulateMessage({
				type: "self_stats",
				wpm: 55,
				rawWpm: 60,
				accuracy: 97,
				wordIndex: 2,
				charIndex: 0,
				timeCorrection: 0,
				score: 200,
				combo: 1.0,
				lastWordScore: 100,
				errors: 1,
			});
			const state = lastState(onStateChange);
			// Should have at most 1 point since both messages arrive in the same second
			expect(state.scoreHistory.length).toBe(1);
		});

		it("uses last-known opponent score when self_stats arrives", () => {
			// Use a startTime far enough in the past to get different elapsed seconds
			const ctx = createClient();
			ctx.client.connect("t");
			ctx.getWs().simulateOpen();
			ctx.getWs().simulateMessage({
				type: "game_start",
				words: ["hello", "world"],
				duration: 30,
				startTime: Date.now() - 2000, // 2 seconds ago
			});
			ctx.onStateChange.mockClear();

			// opponent_progress arrives (elapsed ~2s)
			ctx.getWs().simulateMessage({
				type: "opponent_progress",
				wordIndex: 1,
				charIndex: 0,
				wpm: 40,
				accuracy: 95,
				score: 80,
				combo: 1.0,
				errors: 0,
			});
			// The last-known oppScore is now 80
			const stateAfterOpp = lastState(ctx.onStateChange);
			expect(stateAfterOpp.scoreHistory.length).toBeGreaterThanOrEqual(1);
			const oppPoint =
				stateAfterOpp.scoreHistory[stateAfterOpp.scoreHistory.length - 1];
			expect(oppPoint.oppScore).toBe(80);
		});

		it("resets history on new game_start", () => {
			const { getWs, onStateChange } = playingClient();
			getWs().simulateMessage({
				type: "self_stats",
				wpm: 50,
				rawWpm: 55,
				accuracy: 97,
				wordIndex: 1,
				charIndex: 0,
				timeCorrection: 0,
				score: 100,
				combo: 1.0,
				lastWordScore: 100,
				errors: 0,
			});
			expect(lastState(onStateChange).scoreHistory.length).toBeGreaterThan(0);

			// New game starts
			getWs().simulateMessage({
				type: "game_start",
				words: ["foo", "bar"],
				duration: 30,
				startTime: Date.now() + 60000,
			});
			expect(lastState(onStateChange).scoreHistory).toEqual([]);
		});
	});
});
