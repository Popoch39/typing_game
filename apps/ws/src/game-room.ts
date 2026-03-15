import { log } from "./logger";
import type {
	Player,
	PlayerResult,
	RatingChange,
	ServerMessage,
} from "./types";
import { ServerTypingTracker } from "./typing-tracker";
import { generateWordList } from "./word-list";

type RoomState = "waiting" | "countdown" | "playing" | "finished";

const WORD_COUNT = 100;
const DISCONNECT_GRACE_MS = 5000;

interface PlayerState {
	player: Player;
	tracker: ServerTypingTracker | null;
	wpm: number;
	accuracy: number;
	rawWpm: number;
	completed: boolean;
	disconnected: boolean;
	disconnectTimer: ReturnType<typeof setTimeout> | null;
	rttSamples: number[];
	lastKeystrokeTime: number;
	tolerance: number;
	score: number;
	combo: number;
	wordPoints: number;
	wpmBonus: number;
	timeBonus: number;
	completedAt: number | null;
}

export class GameRoom {
	readonly id: string;
	readonly code: string | null;
	readonly duration: number;
	readonly ranked: boolean;
	private state: RoomState = "waiting";
	private players = new Map<string, PlayerState>();
	private words: string[] = [];
	private gameStartTime = 0;
	private gameTimer: ReturnType<typeof setTimeout> | null = null;
	private countdownTimers: ReturnType<typeof setTimeout>[] = [];
	private pingInterval: ReturnType<typeof setInterval> | null = null;
	private onDestroy: (roomId: string) => void;
	private onFinish:
		| ((
				roomId: string,
				ranked: boolean,
				winner: string | null,
				players: PlayerResult[],
				duration: number,
		  ) => Promise<RatingChange[] | null>)
		| null;

	constructor(
		id: string,
		duration: number,
		onDestroy: (roomId: string) => void,
		code: string | null = null,
		ranked = false,
		onFinish?: (
			roomId: string,
			ranked: boolean,
			winner: string | null,
			players: PlayerResult[],
			duration: number,
		) => Promise<RatingChange[] | null>,
	) {
		this.id = id;
		this.duration = duration;
		this.onDestroy = onDestroy;
		this.code = code;
		this.ranked = ranked;
		this.onFinish = onFinish ?? null;
	}

	get playerCount() {
		return this.players.size;
	}

	get isFull() {
		return this.players.size >= 2;
	}

	get roomState() {
		return this.state;
	}

	getPlayers() {
		return [...this.players.values()].map((ps) => ({
			userId: ps.player.userId.slice(0, 8),
			name: ps.player.name,
			wpm: ps.wpm,
			accuracy: ps.accuracy,
			rawWpm: ps.rawWpm,
			completed: ps.completed,
			disconnected: ps.disconnected,
		}));
	}

	addPlayer(player: Player) {
		if (this.isFull) {
			this.send(player, { type: "error", message: "Room is full" });
			return false;
		}

		this.players.set(player.userId, {
			player,
			tracker: null,
			wpm: 0,
			accuracy: 0,
			rawWpm: 0,
			completed: false,
			disconnected: false,
			disconnectTimer: null,
			rttSamples: [],
			lastKeystrokeTime: 0,
			tolerance: 500,
			score: 0,
			combo: 1.0,
			wordPoints: 0,
			wpmBonus: 0,
			timeBonus: 0,
			completedAt: null,
		});

		if (this.players.size === 2) {
			// Notify both players of the match
			for (const [userId, ps] of this.players) {
				const opponent = this.getOpponent(userId);
				if (opponent) {
					this.send(ps.player, {
						type: "match_found",
						opponent: opponent.player.name,
						roomId: this.id,
					});
				}
			}
			this.startCountdown();
		}

		return true;
	}

	reconnectPlayer(player: Player) {
		const ps = this.players.get(player.userId);
		if (!ps) return false;

		ps.player = player;
		ps.disconnected = false;
		if (ps.disconnectTimer) {
			clearTimeout(ps.disconnectTimer);
			ps.disconnectTimer = null;
		}

		log.room("reconnect", this.id, player.name);

		const opponent = this.getOpponent(player.userId);
		if (opponent) {
			this.send(opponent.player, { type: "opponent_reconnected" });
		}

		return true;
	}

	handleDisconnect(userId: string) {
		const ps = this.players.get(userId);
		if (!ps) return;

		ps.disconnected = true;
		log.room("player-dc", this.id, `${ps.player.name} (state=${this.state})`);

		const opponent = this.getOpponent(userId);
		if (opponent) {
			this.send(opponent.player, { type: "opponent_disconnected" });
		}

		if (this.state === "playing") {
			ps.disconnectTimer = setTimeout(() => {
				this.handleDisconnectTimeout(userId);
			}, DISCONNECT_GRACE_MS);
		} else if (this.state === "waiting" || this.state === "countdown") {
			this.cleanup();
			this.onDestroy(this.id);
		}
	}

	private async handleDisconnectTimeout(userId: string) {
		if (this.state === "finished") return;
		this.state = "finished";

		const opponent = this.getOpponent(userId);
		if (!opponent) return;

		log.room("dc-timeout", this.id, `${userId.slice(0, 8)} forfeited`);

		if (this.gameTimer) {
			clearTimeout(this.gameTimer);
			this.gameTimer = null;
		}

		const winner = opponent.player.userId;
		const results = this.buildResults(winner);

		const ratingChanges = await this.onFinish?.(
			this.id,
			this.ranked,
			winner,
			results,
			this.duration,
		);
		this.broadcast({
			type: "game_result",
			winner,
			players: results,
			...(this.ranked && ratingChanges ? { ranked: true, ratingChanges } : {}),
		});
		this.cleanup();
		this.onDestroy(this.id);
	}

	handlePong(userId: string, serverT: number) {
		const ps = this.players.get(userId);
		if (!ps) return;
		if (this.state !== "countdown" && this.state !== "playing") return;

		const rtt = Date.now() - serverT;
		ps.rttSamples.push(rtt);
		if (ps.rttSamples.length > 10) ps.rttSamples.shift();
		ps.tolerance = Math.max(...ps.rttSamples) + 200;
	}

	handleKeystroke(
		userId: string,
		data:
			| { key: "char"; char: string }
			| { key: "space" }
			| { key: "backspace" }
			| { key: "ctrl_backspace" },
		clientTime: number = Date.now(),
	) {
		if (this.state !== "playing") return;

		const ps = this.players.get(userId);
		if (!ps || !ps.tracker || ps.completed) return;

		switch (data.key) {
			case "char":
				ps.tracker.handleChar(data.char);
				break;
			case "space":
				ps.tracker.handleSpace();
				break;
			case "backspace":
				ps.tracker.handleBackspace();
				break;
			case "ctrl_backspace":
				ps.tracker.handleCtrlBackspace();
				break;
		}

		let t = clientTime;
		const now = Date.now();
		let corrected = false;
		if (
			t < this.gameStartTime ||
			t > now + ps.tolerance ||
			t < ps.lastKeystrokeTime
		) {
			t = now;
			corrected = true;
		}
		ps.lastKeystrokeTime = t;

		const stats = ps.tracker.getStats(t);
		ps.wpm = stats.wpm;
		ps.accuracy = stats.accuracy;
		ps.rawWpm = stats.rawWpm;
		ps.score = stats.score;
		ps.combo = stats.combo;

		// Send authoritative stats back to the player
		this.send(ps.player, {
			type: "self_stats",
			wpm: stats.wpm,
			rawWpm: stats.rawWpm,
			accuracy: stats.accuracy,
			wordIndex: stats.wordIndex,
			charIndex: stats.charIndex,
			timeCorrection: corrected ? t - clientTime : 0,
			score: stats.score,
			combo: stats.combo,
			lastWordScore: stats.lastWordScore,
			errors: stats.errors,
		});

		// Send progress to opponent
		const opponent = this.getOpponent(userId);
		if (opponent) {
			this.send(opponent.player, {
				type: "opponent_progress",
				wordIndex: stats.wordIndex,
				charIndex: stats.charIndex,
				wpm: stats.wpm,
				accuracy: stats.accuracy,
				score: stats.score,
				combo: stats.combo,
				errors: stats.errors,
			});
		}

		// Handle completion
		if (stats.completed) {
			ps.completed = true;
			ps.completedAt = ps.tracker.completedAt;

			// Compute final score with time bonus
			const elapsed = (t - this.gameStartTime) / 1000;
			const remainingSeconds = Math.max(0, this.duration - elapsed);
			const breakdown = ps.tracker.computeFinalScore(
				stats.wpm,
				stats.wordIndex,
				remainingSeconds,
			);
			ps.score = breakdown.total;
			ps.wordPoints = breakdown.wordPoints;
			ps.wpmBonus = breakdown.wpmBonus;
			ps.timeBonus = breakdown.timeBonus;

			log.room(
				"complete",
				this.id,
				`${ps.player.name} ${stats.wpm}wpm ${stats.accuracy}% score=${ps.score}`,
			);

			this.send(ps.player, {
				type: "self_complete",
				wpm: stats.wpm,
				rawWpm: stats.rawWpm,
				accuracy: stats.accuracy,
				score: ps.score,
			});

			if (opponent) {
				this.send(opponent.player, {
					type: "opponent_complete",
					wpm: stats.wpm,
					accuracy: stats.accuracy,
					rawWpm: stats.rawWpm,
				});
			}

			// Check if both completed
			const allCompleted = [...this.players.values()].every((p) => p.completed);
			if (allCompleted) {
				this.finishGame();
			}
		}
	}

	private startCountdown() {
		this.state = "countdown";
		this.words = generateWordList(WORD_COUNT);
		log.room("countdown", this.id);

		const values: [3, 2, 1] = [3, 2, 1];
		for (const [i, val] of values.entries()) {
			const timer = setTimeout(() => {
				this.broadcast({ type: "countdown", value: val });
				this.broadcast({ type: "ping", t: Date.now() });
			}, i * 1000);
			this.countdownTimers.push(timer);
		}

		const startTimer = setTimeout(() => {
			this.startGame();
		}, 3000);
		this.countdownTimers.push(startTimer);
	}

	private startGame() {
		this.state = "playing";
		this.gameStartTime = Date.now();
		log.room("start", this.id, `dur=${this.duration}s`);

		// Initialize a tracker for each player
		for (const ps of this.players.values()) {
			ps.tracker = new ServerTypingTracker(this.words, this.gameStartTime);
		}

		this.broadcast({
			type: "game_start",
			words: this.words,
			duration: this.duration,
			startTime: this.gameStartTime,
		});

		this.pingInterval = setInterval(() => {
			this.broadcast({ type: "ping", t: Date.now() });
		}, 5000);

		this.gameTimer = setTimeout(() => {
			this.finishGame();
		}, this.duration * 1000);
	}

	private async finishGame() {
		if (this.state === "finished") return;
		this.state = "finished";

		if (this.gameTimer) {
			clearTimeout(this.gameTimer);
			this.gameTimer = null;
		}

		// Compute final scores for players who didn't complete (timer ran out)
		const now = Date.now();
		for (const ps of this.players.values()) {
			if (!ps.completed && ps.tracker) {
				const stats = ps.tracker.getStats(now);
				ps.wpm = stats.wpm;
				ps.accuracy = stats.accuracy;
				ps.rawWpm = stats.rawWpm;
				// No time bonus for non-completers (remainingSeconds = 0)
				const breakdown = ps.tracker.computeFinalScore(
					stats.wpm,
					stats.wordIndex,
					0,
				);
				ps.score = breakdown.total;
				ps.wordPoints = breakdown.wordPoints;
				ps.wpmBonus = breakdown.wpmBonus;
				ps.timeBonus = breakdown.timeBonus;
			}
		}

		const players = [...this.players.values()];
		let winner: string | null = null;

		// Winner = highest score
		if (players.length >= 2) {
			const completer = players.find((p) => p.completed);
			const nonCompleter = players.find((p) => !p.completed);

			if (completer && nonCompleter) {
				// One completed → they win
				winner = completer.player.userId;
			} else {
				// Both completed or neither → highest score
				const sorted = players.sort((a, b) => b.score - a.score);
				winner =
					sorted[0]!.score === sorted[1]!.score
						? null
						: sorted[0]!.player.userId;
			}
		}

		const results = this.buildResults(winner);
		const winnerName = winner
			? players.find((p) => p.player.userId === winner)?.player.name
			: "tie";
		log.room("finish", this.id, `winner=${winnerName}`);

		const ratingChanges = await this.onFinish?.(
			this.id,
			this.ranked,
			winner,
			results,
			this.duration,
		);
		this.broadcast({
			type: "game_result",
			winner,
			players: results,
			...(this.ranked && ratingChanges ? { ranked: true, ratingChanges } : {}),
		});
		this.cleanup();
		this.onDestroy(this.id);
	}

	private buildResults(winner: string | null): PlayerResult[] {
		return [...this.players.values()].map((ps) => ({
			userId: ps.player.userId,
			name: ps.player.name,
			wpm: ps.wpm,
			accuracy: ps.accuracy,
			rawWpm: ps.rawWpm,
			completed: ps.completed,
			score: ps.score,
			wordPoints: ps.wordPoints,
			wpmBonus: ps.wpmBonus,
			timeBonus: ps.timeBonus,
			completedAt: ps.completedAt ?? undefined,
		}));
	}

	private getOpponent(userId: string): PlayerState | undefined {
		for (const [id, ps] of this.players) {
			if (id !== userId) return ps;
		}
		return undefined;
	}

	private send(player: Player, msg: ServerMessage) {
		try {
			log.send(player.userId, msg.type);
			player.ws.send(JSON.stringify(msg));
		} catch {}
	}

	private broadcast(msg: ServerMessage) {
		for (const ps of this.players.values()) {
			if (!ps.disconnected) {
				this.send(ps.player, msg);
			}
		}
	}

	private cleanup() {
		for (const timer of this.countdownTimers) clearTimeout(timer);
		this.countdownTimers = [];
		if (this.gameTimer) {
			clearTimeout(this.gameTimer);
			this.gameTimer = null;
		}
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
		for (const ps of this.players.values()) {
			if (ps.disconnectTimer) clearTimeout(ps.disconnectTimer);
		}
	}
}
