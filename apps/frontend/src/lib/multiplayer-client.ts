import type {
	ClientMessage,
	ServerMessage,
	PlayerResult,
} from "@repo/shared/ws-protocol";

// --- Types ---

export type MultiplayerStatus =
	| "idle"
	| "connecting"
	| "queuing"
	| "in_room"
	| "countdown"
	| "playing"
	| "finished";

export interface OpponentState {
	name: string;
	wordIndex: number;
	charIndex: number;
	wpm: number;
	accuracy: number;
	rawWpm: number;
	completed: boolean;
	score: number;
	combo: number;
}

export interface SelfStats {
	wpm: number;
	rawWpm: number;
	accuracy: number;
	wordIndex: number;
	charIndex: number;
	timeCorrection: number;
	score: number;
	combo: number;
	lastWordScore: number;
}

export interface MultiplayerState {
	status: MultiplayerStatus;
	roomCode: string | null;
	countdownValue: number | null;
	opponent: OpponentState | null;
	gameWords: string[] | null;
	gameDuration: number | null;
	gameStartTime: number | null;
	gameResult: {
		winner: string | null;
		players: PlayerResult[];
	} | null;
	error: string | null;
	opponentDisconnected: boolean;
	selfStats: SelfStats | null;
	selfComplete: boolean;
}

export interface MultiplayerClientCallbacks {
	onStateChange: (state: MultiplayerState) => void;
}

export type WebSocketFactory = (url: string) => WebSocket;

// --- Initial state ---

const initialState: MultiplayerState = {
	status: "idle",
	roomCode: null,
	countdownValue: null,
	opponent: null,
	gameWords: null,
	gameDuration: null,
	gameStartTime: null,
	gameResult: null,
	error: null,
	opponentDisconnected: false,
	selfStats: null,
	selfComplete: false,
};

// --- Logger ---

const isDev = process.env.NODE_ENV !== "production";

function log(tag: string, ...args: unknown[]) {
	if (!isDev) return;
	const time = new Date().toLocaleTimeString("en-US", { hour12: false });
	console.log(`%c[ws:${tag}]%c ${time}`, "color:#7c5cfc;font-weight:bold", "color:gray", ...args);
}

// --- Client ---

export class MultiplayerClient {
	private ws: WebSocket | null = null;
	private state: MultiplayerState = { ...initialState };
	private callbacks: MultiplayerClientCallbacks;
	private wsFactory: WebSocketFactory;

	constructor(
		callbacks: MultiplayerClientCallbacks,
		wsFactory?: WebSocketFactory,
	) {
		this.callbacks = callbacks;
		this.wsFactory = wsFactory ?? ((url: string) => new WebSocket(url));
	}

	connect(token: string): void {
		// Close existing connection if any
		if (this.ws) {
			log("connect", "closing previous connection");
			this.ws.onopen = null;
			this.ws.onmessage = null;
			this.ws.onclose = null;
			this.ws.close();
		}

		const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";
		const ws = this.wsFactory(`${wsUrl}/ws?token=${token}`);
		this.ws = ws;

		log("connect", "opening →", `${wsUrl}/ws`);
		this.setState({ status: "connecting" });

		ws.onopen = () => {
			if (this.ws === ws) {
				log("connect", "connected ✓");
				this.setState({ status: "idle" });
			} else {
				log("connect", "open event from stale ws, ignoring");
			}
		};

		ws.onmessage = (event: MessageEvent) => {
			if (this.ws !== ws) return;
			let msg: ServerMessage;
			try {
				msg = JSON.parse(event.data);
			} catch {
				log("recv", "invalid JSON:", event.data);
				return;
			}
			if (msg.type !== "opponent_progress" && msg.type !== "self_stats") {
				log("recv", `← ${msg.type}`, msg);
			}
			this.handleMessage(msg);
		};

		ws.onclose = (event: CloseEvent) => {
			log("connect", `closed (code=${event.code}, reason=${event.reason || "none"})`);
			if (this.ws === ws) {
				this.ws = null;
			}
		};
	}

	disconnect(): void {
		log("disconnect", "closing");
		if (this.ws) {
			this.ws.onopen = null;
			this.ws.onmessage = null;
			this.ws.onclose = null;
			this.ws.close();
			this.ws = null;
		}
		this.state = { ...initialState };
		this.callbacks.onStateChange(this.state);
	}

	destroy(): void {
		log("destroy", "cleanup");
		this.disconnect();
	}

	joinQueue(duration: number): void {
		this.send({ type: "join_queue", duration });
	}

	leaveQueue(): void {
		this.send({ type: "leave_queue" });
		this.setState({ status: "idle" });
	}

	createRoom(duration: number): void {
		this.send({ type: "create_room", duration });
	}

	joinRoom(code: string): void {
		this.send({ type: "join_room", code });
	}

	sendKeystroke(
		data:
			| { key: "char"; char: string }
			| { key: "space" }
			| { key: "backspace" }
			| { key: "ctrl_backspace" },
	): void {
		this.send({ type: "keystroke", ...data, t: Date.now() } as ClientMessage);
	}

	getState(): MultiplayerState {
		return this.state;
	}

	private send(msg: ClientMessage): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			if (msg.type !== "keystroke") {
				log("send", `→ ${msg.type}`, msg);
			}
			this.ws.send(JSON.stringify(msg));
		} else {
			log("send", `⚠ dropped (ws ${this.ws ? `readyState=${this.ws.readyState}` : "null"})`, msg.type);
		}
	}

	private handleMessage(msg: ServerMessage): void {
		switch (msg.type) {
			case "queue_joined":
				this.setState({ status: "queuing" });
				break;
			case "room_created":
				this.setState({ roomCode: msg.code, status: "in_room" });
				break;
			case "room_joined":
				this.setState({
					opponent: {
						name: msg.opponent,
						wordIndex: 0,
						charIndex: 0,
						wpm: 0,
						accuracy: 100,
						rawWpm: 0,
						completed: false,
						score: 0,
						combo: 1.0,
					},
					status: "in_room",
				});
				break;
			case "match_found":
				this.setState({
					opponent: {
						name: msg.opponent,
						wordIndex: 0,
						charIndex: 0,
						wpm: 0,
						accuracy: 100,
						rawWpm: 0,
						completed: false,
						score: 0,
						combo: 1.0,
					},
					status: "countdown",
				});
				break;
			case "countdown":
				this.setState({ countdownValue: msg.value, status: "countdown" });
				break;
			case "game_start":
				this.setState({
					gameWords: msg.words,
					gameDuration: msg.duration,
					gameStartTime: msg.startTime,
					status: "playing",
					selfStats: null,
					selfComplete: false,
				});
				break;
			case "self_stats":
				this.setState({
					selfStats: {
						wpm: msg.wpm,
						rawWpm: msg.rawWpm,
						accuracy: msg.accuracy,
						wordIndex: msg.wordIndex,
						charIndex: msg.charIndex,
						timeCorrection: msg.timeCorrection,
						score: msg.score,
						combo: msg.combo,
						lastWordScore: msg.lastWordScore,
					},
				});
				break;
			case "self_complete":
				this.setState({
					selfComplete: true,
					selfStats: {
						wpm: msg.wpm,
						rawWpm: msg.rawWpm,
						accuracy: msg.accuracy,
						wordIndex: this.state.selfStats?.wordIndex ?? 0,
						charIndex: this.state.selfStats?.charIndex ?? 0,
						timeCorrection: this.state.selfStats?.timeCorrection ?? 0,
						score: msg.score,
						combo: this.state.selfStats?.combo ?? 1.0,
						lastWordScore: this.state.selfStats?.lastWordScore ?? 0,
					},
				});
				break;
			case "opponent_progress":
				this.setState({
					opponent: this.state.opponent
						? { ...this.state.opponent, ...msg }
						: {
								name: "",
								rawWpm: 0,
								completed: false,
								wordIndex: msg.wordIndex,
								charIndex: msg.charIndex,
								wpm: msg.wpm,
								accuracy: msg.accuracy,
								score: msg.score,
								combo: msg.combo,
							},
				});
				break;
			case "opponent_complete":
				this.setState({
					opponent: this.state.opponent
						? {
								...this.state.opponent,
								wpm: msg.wpm,
								accuracy: msg.accuracy,
								rawWpm: msg.rawWpm,
								completed: true,
							}
						: {
								name: "",
								wordIndex: 0,
								charIndex: 0,
								wpm: msg.wpm,
								accuracy: msg.accuracy,
								rawWpm: msg.rawWpm,
								completed: true,
								score: 0,
								combo: 1.0,
							},
				});
				break;
			case "game_result":
				this.setState({
					gameResult: { winner: msg.winner, players: msg.players },
					status: "finished",
				});
				break;
			case "opponent_disconnected":
				this.setState({ opponentDisconnected: true });
				break;
			case "opponent_reconnected":
				this.setState({ opponentDisconnected: false });
				break;
			case "ping":
				this.send({ type: "pong", t: (msg as any).t } as ClientMessage);
				break;
			case "error":
				this.setState({ error: msg.message });
				break;
		}
	}

	private setState(partial: Partial<MultiplayerState>): void {
		this.state = { ...this.state, ...partial };
		this.callbacks.onStateChange(this.state);
	}
}
