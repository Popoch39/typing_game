/**
 * WS Stress Test
 *
 * Usage:
 *   bun run src/bench/stress.ts                     # internal benchmark (no server needed)
 *   bun run src/bench/stress.ts --ws --tokens t1,t2 # real WS benchmark (server must be running)
 *
 * Options:
 *   --ws              Connect to a real WS server
 *   --url <url>       WS server URL (default: ws://localhost:3002/ws)
 *   --tokens <t1,t2>  Comma-separated session tokens for 2 players
 *   --pairs <n>       Number of concurrent game pairs (default: 1, ws mode only)
 *   --keystrokes <n>  Total keystrokes per player (default: 10000)
 *   --batch <n>       Keystrokes per batch before yielding (default: 1000)
 */

import { parseArgs } from "util";

// Silence internal logger, keep our output
const write = (msg: string) => process.stdout.write(`${msg}\n`);
console.log = () => {};
console.error = () => {};

import { GameRoom } from "../game-room";
import { Matchmaking } from "../matchmaking";
import type { Player } from "../types";

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		ws: { type: "boolean", default: false },
		url: { type: "string", default: "ws://localhost:3002/ws" },
		tokens: { type: "string", default: "" },
		pairs: { type: "string", default: "1" },
		keystrokes: { type: "string", default: "10000" },
		batch: { type: "string", default: "1000" },
	},
});

const KEYSTROKES = Number(values.keystrokes);
const BATCH = Number(values.batch);

// ─── Internal benchmark (no network) ────────────────────────────────────────

function benchInternal() {
	write("=== Internal Stress Test (no network) ===\n");
	benchGameRoom();
	benchMatchmaking();
}

function benchGameRoom() {
	const noop = () => {};
	let msgCount = 0;

	const makePlayer = (id: string, name: string): Player => ({
		ws: {
			send: () => {
				msgCount++;
			},
			close: noop,
		},
		userId: id,
		name,
	});

	const room = new GameRoom("bench-room", 300, noop);
	const p1 = makePlayer("player-1", "Alice");
	const p2 = makePlayer("player-2", "Bob");

	room.addPlayer(p1);
	room.addPlayer(p2);

	write("Waiting for countdown (3s)...");

	setTimeout(() => {
		msgCount = 0;
		const chars = "abcdefghijklmnopqrstuvwxyz";

		const start = performance.now();
		for (let i = 0; i < KEYSTROKES; i++) {
			room.handleKeystroke("player-1", {
				key: "char",
				char: chars[i % chars.length]!,
			});
		}
		const elapsed = performance.now() - start;
		const perSec = Math.round((KEYSTROKES / elapsed) * 1000);

		write(`\n📊 GameRoom keystroke throughput:`);
		write(
			`   ${KEYSTROKES.toLocaleString()} keystrokes in ${elapsed.toFixed(1)}ms`,
		);
		write(`   ${perSec.toLocaleString()} keystrokes/sec`);
		write(`   ${msgCount.toLocaleString()} WS messages generated`);
		write(`   ${((elapsed / KEYSTROKES) * 1000).toFixed(1)}µs per keystroke`);

		// Measure space (word transitions)
		msgCount = 0;
		const spaceCount = 5000;
		const start2 = performance.now();
		for (let i = 0; i < spaceCount; i++) {
			room.handleKeystroke("player-2", { key: "space" });
		}
		const elapsed2 = performance.now() - start2;
		const perSec2 = Math.round((spaceCount / elapsed2) * 1000);

		write(`\n📊 GameRoom space throughput:`);
		write(
			`   ${spaceCount.toLocaleString()} spaces in ${elapsed2.toFixed(1)}ms`,
		);
		write(`   ${perSec2.toLocaleString()} spaces/sec`);
	}, 3200);
}

function benchMatchmaking() {
	setTimeout(() => {
		const noop = () => {};
		const mm = new Matchmaking();
		const pairCount = 500;
		let msgCount = 0;

		const start = performance.now();
		for (let i = 0; i < pairCount; i++) {
			const p1: Player = {
				ws: {
					send: () => {
						msgCount++;
					},
					close: noop,
				},
				userId: `user-${i * 2}`,
				name: `Player${i * 2}`,
			};
			const p2: Player = {
				ws: {
					send: () => {
						msgCount++;
					},
					close: noop,
				},
				userId: `user-${i * 2 + 1}`,
				name: `Player${i * 2 + 1}`,
			};
			mm.joinQueue(p1, 30);
			mm.joinQueue(p2, 30);
		}
		const elapsed = performance.now() - start;

		write(`\n📊 Matchmaking throughput:`);
		write(`   ${pairCount} pairs matched in ${elapsed.toFixed(1)}ms`);
		write(
			`   ${Math.round((pairCount / elapsed) * 1000).toLocaleString()} matches/sec`,
		);
		write(`   ${msgCount.toLocaleString()} WS messages generated`);

		process.exit(0);
	}, 4000);
}

// ─── Real WS benchmark ─────────────────────────────────────────────────────

async function benchWs() {
	const url = values.url!;
	const tokens = values.tokens!.split(",").filter(Boolean);
	const pairs = Number(values.pairs);

	if (tokens.length < 2) {
		write("ERROR: Need at least 2 tokens: --tokens token1,token2");
		write("\nTo get tokens, check your session table:");
		write("  docker compose exec postgres psql -U postgres -d typing_game \\");
		write(
			'    -c "SELECT token FROM session ORDER BY created_at DESC LIMIT 2"',
		);
		process.exit(1);
	}

	write(`=== Real WS Stress Test ===`);
	write(`URL: ${url}`);
	write(`Pairs: ${pairs}`);
	write(`Keystrokes/player: ${KEYSTROKES.toLocaleString()}\n`);

	const results: {
		pair: number;
		elapsed: number;
		sent: number;
		received: number;
		latencies: number[];
	}[] = [];

	for (let p = 0; p < pairs; p++) {
		const result = await benchWsPair(url, tokens[0]!, tokens[1]!, p);
		results.push(result);
	}

	write("\n=== Summary ===");
	const totalSent = results.reduce((s, r) => s + r.sent, 0);
	const totalElapsed = Math.max(...results.map((r) => r.elapsed));
	const allLatencies = results
		.flatMap((r) => r.latencies)
		.sort((a, b) => a - b);

	write(`Total keystrokes sent: ${totalSent.toLocaleString()}`);
	write(`Total time: ${totalElapsed.toFixed(0)}ms`);
	write(
		`Throughput: ${Math.round((totalSent / totalElapsed) * 1000).toLocaleString()} keystrokes/sec`,
	);

	if (allLatencies.length > 0) {
		const p50 = allLatencies[Math.floor(allLatencies.length * 0.5)]!;
		const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)]!;
		const p99 = allLatencies[Math.floor(allLatencies.length * 0.99)]!;
		write(
			`Latency p50: ${p50.toFixed(2)}ms  p95: ${p95.toFixed(2)}ms  p99: ${p99.toFixed(2)}ms`,
		);
	}
}

async function benchWsPair(
	url: string,
	token1: string,
	token2: string,
	pairIdx: number,
) {
	const latencies: number[] = [];
	let received = 0;

	function connect(token: string): Promise<WebSocket> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(`${url}?token=${token}`);
			ws.onopen = () => resolve(ws);
			ws.onerror = (e) => reject(e);
			ws.onmessage = () => {
				received++;
			};
		});
	}

	const ws1 = await connect(token1);
	const ws2 = await connect(token2);
	write(`Pair ${pairIdx}: connected`);

	ws1.send(JSON.stringify({ type: "join_queue", duration: 30 }));
	ws2.send(JSON.stringify({ type: "join_queue", duration: 30 }));

	// Wait for game_start
	await new Promise<void>((resolve) => {
		const orig = ws1.onmessage;
		ws1.onmessage = (e) => {
			received++;
			const msg = JSON.parse(e.data as string);
			if (msg.type === "game_start") {
				ws1.onmessage = orig;
				resolve();
			}
		};
	});
	write(
		`Pair ${pairIdx}: game started, sending ${KEYSTROKES.toLocaleString()} keystrokes...`,
	);

	const chars = "abcdefghijklmnopqrstuvwxyz";
	const start = performance.now();
	let sent = 0;

	for (let batch = 0; batch < KEYSTROKES; batch += BATCH) {
		const end = Math.min(batch + BATCH, KEYSTROKES);
		for (let i = batch; i < end; i++) {
			const t0 = performance.now();
			ws1.send(
				JSON.stringify({
					type: "keystroke",
					key: "char",
					char: chars[i % chars.length],
				}),
			);
			latencies.push(performance.now() - t0);
			sent++;
		}
		await new Promise((r) => setTimeout(r, 0));
	}

	const elapsed = performance.now() - start;
	const perSec = Math.round((sent / elapsed) * 1000);

	write(
		`Pair ${pairIdx}: ${sent.toLocaleString()} sent in ${elapsed.toFixed(0)}ms (${perSec.toLocaleString()}/sec), ${received} responses`,
	);

	ws1.close();
	ws2.close();

	return { pair: pairIdx, elapsed, sent, received, latencies };
}

// ─── Main ───────────────────────────────────────────────────────────────────

if (values.ws) {
	benchWs();
} else {
	benchInternal();
}
