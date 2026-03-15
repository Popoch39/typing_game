import { Elysia, t } from "elysia";
import { validateSession } from "./auth";
import { Matchmaking } from "./matchmaking";
import { PresenceTracker } from "./presence";
import { initRedis, getRedis, getRedisSub } from "./redis";
import type { ClientMessage, Player, PlayerResult, RatingChange } from "./types";
import { log } from "./logger";

const PORT = Number(process.env.PORT) || 3002;
const API_URL = process.env.API_INTERNAL_URL || "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "";

let presence: PresenceTracker;

async function handleGameFinish(
	roomId: string,
	ranked: boolean,
	winner: string | null,
	players: PlayerResult[],
	duration: number,
): Promise<RatingChange[] | null> {
	if (players.length !== 2) return null;
	const [p1, p2] = players;
	try {
		const res = await fetch(`${API_URL}/api/rating/internal/match-result`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Internal-Secret": INTERNAL_SECRET,
			},
			body: JSON.stringify({
				roomId,
				player1Id: p1.userId,
				player2Id: p2.userId,
				winnerId: winner,
				player1Score: p1.score,
				player2Score: p2.score,
				player1Wpm: p1.wpm,
				player2Wpm: p2.wpm,
				player1Accuracy: p1.accuracy,
				player2Accuracy: p2.accuracy,
				mode: ranked ? "ranked" : "casual",
				duration,
			}),
		});
		if (!res.ok) {
			console.error(
				"[game-finish] API error:",
				res.status,
				await res.text(),
			);
			return null;
		}
		if (ranked) {
			const data = await res.json() as {
				ratings: {
					player1: { before: number; after: number } | null;
					player2: { before: number; after: number } | null;
				};
			};
			const r = data.ratings;
			if (r.player1 && r.player2) {
				return [
					{
						userId: p1.userId,
						oldRating: r.player1.before,
						newRating: r.player1.after,
						change: Math.round(r.player1.after - r.player1.before),
					},
					{
						userId: p2.userId,
						oldRating: r.player2.before,
						newRating: r.player2.after,
						change: Math.round(r.player2.after - r.player2.before),
					},
				];
			}
		}
		return null;
	} catch (err) {
		console.error("[game-finish] Failed to persist match:", err);
		return null;
	}
}

let matchmaking: Matchmaking;

// Track authenticated players by ws raw object reference
const wsPlayers = new WeakMap<object, Player>();

const app = new Elysia()
	.get("/health", () => ({ status: "ok" }))
	.get("/dashboard", () => {
		const snapshot = matchmaking.getSnapshot();
		return new Response(renderDashboard(snapshot), {
			headers: { "content-type": "text/html; charset=utf-8" },
		});
	})
	.get("/api/snapshot", () => matchmaking.getSnapshot())
	.ws("/ws", {
		query: t.Object({
			token: t.String(),
		}),
		async open(ws) {
			const token = ws.data.query.token;

			let user: { userId: string; name: string } | null = null;
			try {
				user = await validateSession(token);
			} catch (err) {
				log.error("auth error", err);
				ws.send(JSON.stringify({ type: "error", message: "Auth error" }));
				ws.close();
				return;
			}

			if (!user) {
				ws.send(JSON.stringify({ type: "error", message: "Invalid session" }));
				ws.close();
				return;
			}

			log.conn(user.userId, user.name);

			const player: Player = {
				ws: {
					send: (data: string) => ws.send(data),
					close: () => ws.close(),
				},
				userId: user.userId,
				name: user.name,
			};

			wsPlayers.set(ws.raw, player);
			await presence.connect(user.userId, user.name, player.ws);
		},
		async message(ws, raw) {
			const player = wsPlayers.get(ws.raw);
			if (!player) return;

			let msg: ClientMessage;
			try {
				msg =
					typeof raw === "string" ? JSON.parse(raw) : (raw as ClientMessage);
			} catch {
				return;
			}

			log.msg(player.userId, msg.type);

			switch (msg.type) {
				case "join_queue":
					matchmaking.joinQueue(player, msg.duration);
					break;
				case "leave_queue":
					matchmaking.leaveQueue(player.userId);
					break;
				case "create_room":
					matchmaking.createRoom(player, msg.duration);
					break;
				case "join_room":
					matchmaking.joinRoom(player, msg.code);
					break;
				case "join_ranked_queue": {
					let rating = 1500;
					try {
						const res = await fetch(
							`${API_URL}/api/rating/${player.userId}`,
						);
						if (res.ok) {
							const data = (await res.json()) as { rating: number };
							rating = data.rating;
						}
					} catch {
						// Use default rating
					}
					matchmaking.joinRankedQueue(player, msg.duration, rating);
					break;
				}
				case "leave_ranked_queue":
					matchmaking.leaveRankedQueue(player.userId);
					break;
				case "keystroke":
				case "pong":
					matchmaking.handleMessage(player.userId, msg);
					break;
			}
		},
		async close(ws) {
			const player = wsPlayers.get(ws.raw);
			if (player) {
				log.disc(player.userId, player.name);
				matchmaking.handleDisconnect(player.userId);
				await presence.disconnect(player.userId);
			}
			wsPlayers.delete(ws.raw);
		},
	})
	.listen(PORT);

log.info(`WS server running on :${PORT}`);
log.info(`Dashboard: http://localhost:${PORT}/dashboard`);

initRedis()
	.then(async () => {
		const redis = getRedis();
		presence = new PresenceTracker(redis);
		await presence.cleanup();
		matchmaking = new Matchmaking(presence, handleGameFinish);

		matchmaking.initRanked();
		const sub = getRedisSub();
		sub.subscribe("elo:update");
		sub.on("message", (_channel, _message) => {
			// Rating updates forwarded via game_result messages
		});
		log.info("Ranked matchmaking enabled");
	})
	.catch((err) => {
		console.warn("[redis] Init failed, ranked matchmaking disabled:", err);
	});

// --- Dashboard HTML ---

function renderDashboard(snapshot: ReturnType<typeof matchmaking.getSnapshot>) {
	const roomRows = snapshot.rooms
		.map(
			(r) => `
		<tr>
			<td><code>${r.id.slice(0, 8)}</code></td>
			<td>${r.code ?? "—"}</td>
			<td><span class="badge ${r.state}">${r.state}</span></td>
			<td>${r.duration}s</td>
			<td>${r.players
				.map(
					(p) =>
						`<span class="player ${p.disconnected ? "dc" : ""}">${p.name} <span class="stats">${p.wpm}wpm ${p.accuracy}%${p.completed ? " ✓" : ""}</span></span>`,
				)
				.join("")}</td>
		</tr>`,
		)
		.join("");

	const queueRows = snapshot.queues
		.map(
			(q) => `
		<tr>
			<td>${q.duration}s</td>
			<td>${q.players.map((p) => `<span class="player">${p.name}</span>`).join("")}</td>
			<td>${q.count}</td>
		</tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="3">
<title>WS Dashboard</title>
<style>
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 24px; }
	h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
	.subtitle { color: #737373; font-size: 13px; margin-bottom: 24px; }
	.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
	@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
	.card { background: #141414; border: 1px solid #262626; border-radius: 8px; padding: 16px; }
	.card h2 { font-size: 14px; font-weight: 500; color: #a3a3a3; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
	.card h2 .count { background: #262626; color: #d4d4d4; font-size: 11px; padding: 2px 7px; border-radius: 10px; }
	table { width: 100%; border-collapse: collapse; font-size: 13px; }
	th { text-align: left; color: #737373; font-weight: 500; padding: 6px 8px; border-bottom: 1px solid #262626; }
	td { padding: 8px; border-bottom: 1px solid #1a1a1a; }
	code { font-family: "SF Mono", "Fira Code", monospace; font-size: 12px; color: #a78bfa; }
	.badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
	.badge.waiting { background: #422006; color: #fb923c; }
	.badge.countdown { background: #1e1b4b; color: #a78bfa; }
	.badge.playing { background: #052e16; color: #4ade80; }
	.badge.finished { background: #1c1917; color: #a8a29e; }
	.player { display: inline-block; background: #1c1c1c; border: 1px solid #2a2a2a; padding: 2px 8px; border-radius: 4px; margin: 2px; font-size: 12px; }
	.player.dc { opacity: 0.4; text-decoration: line-through; }
	.player .stats { color: #737373; font-size: 11px; }
	.empty { color: #525252; font-style: italic; padding: 12px 8px; }
	.stat-bar { display: flex; gap: 16px; margin-bottom: 24px; }
	.stat { background: #141414; border: 1px solid #262626; border-radius: 8px; padding: 12px 16px; min-width: 100px; }
	.stat .value { font-size: 24px; font-weight: 600; font-family: "SF Mono", monospace; }
	.stat .label { font-size: 11px; color: #737373; margin-top: 2px; }
</style>
</head>
<body>
	<h1>WS Dashboard</h1>
	<p class="subtitle">Auto-refreshes every 3s</p>

	<div class="stat-bar">
		<div class="stat">
			<div class="value">${snapshot.rooms.length}</div>
			<div class="label">Rooms</div>
		</div>
		<div class="stat">
			<div class="value">${snapshot.queues.reduce((n, q) => n + q.count, 0)}</div>
			<div class="label">In queue</div>
		</div>
		<div class="stat">
			<div class="value">${snapshot.rooms.filter((r) => r.state === "playing").length}</div>
			<div class="label">Playing</div>
		</div>
	</div>

	<div class="grid">
		<div class="card">
			<h2>Rooms <span class="count">${snapshot.rooms.length}</span></h2>
			${
				snapshot.rooms.length > 0
					? `<table>
				<thead><tr><th>ID</th><th>Code</th><th>State</th><th>Dur</th><th>Players</th></tr></thead>
				<tbody>${roomRows}</tbody>
			</table>`
					: '<p class="empty">No active rooms</p>'
			}
		</div>
		<div class="card">
			<h2>Queues <span class="count">${snapshot.queues.reduce((n, q) => n + q.count, 0)}</span></h2>
			${
				snapshot.queues.length > 0
					? `<table>
				<thead><tr><th>Duration</th><th>Players</th><th>Count</th></tr></thead>
				<tbody>${queueRows}</tbody>
			</table>`
					: '<p class="empty">No one in queue</p>'
			}
		</div>
	</div>
</body>
</html>`;
}
