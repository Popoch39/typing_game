import { Elysia, t } from "elysia";
import { validateSession } from "./auth";
import { Matchmaking } from "./matchmaking";
import type { ClientMessage, Player } from "./types";
import { log } from "./logger";

const PORT = Number(process.env.PORT) || 3002;

const matchmaking = new Matchmaking();

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
		},
		message(ws, raw) {
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
				case "keystroke":
					matchmaking.handleMessage(player.userId, msg);
					break;
			}
		},
		close(ws) {
			const player = wsPlayers.get(ws.raw);
			if (player) {
				log.disc(player.userId, player.name);
				matchmaking.handleDisconnect(player.userId);
			}
			wsPlayers.delete(ws.raw);
		},
	})
	.listen(PORT);

log.info(`WS server running on :${PORT}`);
log.info(`Dashboard: http://localhost:${PORT}/dashboard`);

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
