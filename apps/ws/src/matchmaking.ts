import type { Player, PlayerResult, RatingChange } from "./types";
import { GameRoom } from "./game-room";
import type { PresenceTracker } from "./presence";
import { RankedMatchmaking } from "./ranked-matchmaking";
import { getRedis } from "./redis";
import { log } from "./logger";

function generateId(): string {
	return crypto.randomUUID();
}

function generateCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let code = "";
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

// Queue entry
interface QueueEntry {
	player: Player;
	joinedAt: number;
}

export class Matchmaking {
	// duration → queue of waiting players
	private queues = new Map<number, QueueEntry[]>();
	// roomId → GameRoom
	private rooms = new Map<string, GameRoom>();
	// code → roomId (for private rooms)
	private codeToRoom = new Map<string, string>();
	// userId → roomId (track which room a player is in)
	private playerRooms = new Map<string, string>();
	// userId → duration (track queue membership)
	private playerQueues = new Map<string, number>();
	private presence: PresenceTracker | null;
	private rankedMatchmaking: RankedMatchmaking | null = null;
	private onGameFinish:
		| ((
				roomId: string,
				ranked: boolean,
				winner: string | null,
				players: PlayerResult[],
				duration: number,
		  ) => Promise<RatingChange[] | null>)
		| null = null;

	constructor(
		presence?: PresenceTracker,
		onGameFinish?: (
			roomId: string,
			ranked: boolean,
			winner: string | null,
			players: PlayerResult[],
			duration: number,
		) => Promise<RatingChange[] | null>,
	) {
		this.presence = presence ?? null;
		this.onGameFinish = onGameFinish ?? null;
	}

	initRanked(): void {
		const redis = getRedis();
		this.rankedMatchmaking = new RankedMatchmaking({
			redis,
			presence: this.presence,
			onMatch: (p1, p2, duration) =>
				this.createMatch(p1, p2, duration, true),
		});
		this.rankedMatchmaking.startMatcherLoop();
	}

	async joinRankedQueue(
		player: Player,
		duration: number,
		rating: number,
	): Promise<void> {
		this.leaveQueue(player.userId);
		await this.rankedMatchmaking?.joinQueue(player, duration, rating);
	}

	async leaveRankedQueue(userId: string): Promise<void> {
		await this.rankedMatchmaking?.leaveQueue(userId);
	}

	private destroyRoom = (roomId: string) => {
		const room = this.rooms.get(roomId);
		if (!room) return;
		log.room("destroy", roomId);
		if (room.code) this.codeToRoom.delete(room.code);
		this.rooms.delete(roomId);
		// Clean up player room associations and reset presence
		for (const [userId, rId] of this.playerRooms) {
			if (rId === roomId) {
				this.playerRooms.delete(userId);
				this.presence?.setStatus(userId, "online");
			}
		}
	};

	joinQueue(player: Player, duration: number) {
		// Remove from any existing queue
		this.leaveQueue(player.userId);

		if (!this.queues.has(duration)) {
			this.queues.set(duration, []);
		}

		const queue = this.queues.get(duration)!;
		queue.push({ player, joinedAt: Date.now() });
		this.playerQueues.set(player.userId, duration);
		this.presence?.setStatus(player.userId, "queuing");
		log.queue("join", player.userId, duration, queue.length);

		// Try to match
		if (queue.length >= 2) {
			const p1 = queue.shift()!;
			const p2 = queue.shift()!;
			this.playerQueues.delete(p1.player.userId);
			this.playerQueues.delete(p2.player.userId);
			log.queue("match", player.userId, duration, queue.length);
			this.createMatch(p1.player, p2.player, duration);
			return;
		}

		// Notify position in queue
		player.ws.send(
			JSON.stringify({ type: "queue_joined", position: queue.length }),
		);
	}

	leaveQueue(userId: string) {
		const duration = this.playerQueues.get(userId);
		if (duration === undefined) return;

		const queue = this.queues.get(duration);
		if (queue) {
			const idx = queue.findIndex((e) => e.player.userId === userId);
			if (idx !== -1) queue.splice(idx, 1);
			log.queue("leave", userId, duration, queue.length);
		}
		this.playerQueues.delete(userId);
		this.presence?.setStatus(userId, "online");
	}

	createRoom(player: Player, duration: number): string {
		const roomId = generateId();
		const code = generateCode();

		const room = new GameRoom(
			roomId,
			duration,
			this.destroyRoom,
			code,
			false,
			this.onGameFinish ?? undefined,
		);
		this.rooms.set(roomId, room);
		this.codeToRoom.set(code, roomId);
		this.playerRooms.set(player.userId, roomId);
		this.presence?.setStatus(player.userId, "in_game");

		room.addPlayer(player);
		log.room("create", roomId, `code=${code} dur=${duration}s`);

		player.ws.send(JSON.stringify({ type: "room_created", code }));
		return code;
	}

	joinRoom(player: Player, code: string): boolean {
		const roomId = this.codeToRoom.get(code.toUpperCase());
		if (!roomId) {
			player.ws.send(
				JSON.stringify({ type: "error", message: "Room not found" }),
			);
			return false;
		}

		const room = this.rooms.get(roomId);
		if (!room || room.isFull) {
			player.ws.send(
				JSON.stringify({ type: "error", message: "Room is full or not found" }),
			);
			return false;
		}

		this.playerRooms.set(player.userId, roomId);
		this.presence?.setStatus(player.userId, "in_game");
		const added = room.addPlayer(player);
		if (added) {
			log.room("join", roomId, `code=${code} by ${player.name}`);
			// Notify the joiner about the room
			const opponent = [...this.playerRooms.entries()].find(
				([uid, rid]) => rid === roomId && uid !== player.userId,
			);
			if (opponent) {
				player.ws.send(
					JSON.stringify({
						type: "room_joined",
						opponent: "Opponent",
					}),
				);
			}
		}
		return added;
	}

	handleDisconnect(userId: string) {
		this.leaveQueue(userId);
		this.rankedMatchmaking?.leaveQueue(userId);

		const roomId = this.playerRooms.get(userId);
		if (roomId) {
			const room = this.rooms.get(roomId);
			if (room) room.handleDisconnect(userId);
		}
	}

	handleMessage(userId: string, data: unknown) {
		const roomId = this.playerRooms.get(userId);
		if (!roomId) return;

		const room = this.rooms.get(roomId);
		if (!room) return;

		const msg = data as { type: string; [key: string]: unknown };

		switch (msg.type) {
			case "keystroke":
				room.handleKeystroke(userId, msg as never, msg.t as number);
				break;
			case "pong":
				room.handlePong(userId, msg.t as number);
				break;
		}
	}

	getPlayerRoom(userId: string): string | undefined {
		return this.playerRooms.get(userId);
	}

	getSnapshot() {
		const rooms = [...this.rooms.values()].map((room) => ({
			id: room.id,
			code: room.code,
			state: room.roomState,
			duration: room.duration,
			players: room.getPlayers(),
		}));

		const queues = [...this.queues.entries()]
			.filter(([, entries]) => entries.length > 0)
			.map(([duration, entries]) => ({
				duration,
				count: entries.length,
				players: entries.map((e) => ({
					name: e.player.name,
					userId: e.player.userId.slice(0, 8),
					waitingSince: e.joinedAt,
				})),
			}));

		return {
			rooms,
			queues,
			rankedAvailable: this.rankedMatchmaking !== null,
		};
	}

	private createMatch(
		p1: Player,
		p2: Player,
		duration: number,
		ranked = false,
	) {
		const roomId = generateId();
		const room = new GameRoom(
			roomId,
			duration,
			this.destroyRoom,
			null,
			ranked,
			this.onGameFinish ?? undefined,
		);
		this.rooms.set(roomId, room);
		this.playerRooms.set(p1.userId, roomId);
		this.playerRooms.set(p2.userId, roomId);
		this.presence?.setStatus(p1.userId, "in_game");
		this.presence?.setStatus(p2.userId, "in_game");
		room.addPlayer(p1);
		room.addPlayer(p2);
		log.room("match", roomId, `${p1.name} vs ${p2.name} dur=${duration}s`);
	}
}
