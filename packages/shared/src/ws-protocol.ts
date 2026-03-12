// Client → Server
export type ClientMessage =
	| { type: "join_queue"; duration: number }
	| { type: "leave_queue" }
	| { type: "create_room"; duration: number }
	| { type: "join_room"; code: string }
	| { type: "keystroke"; key: "char"; char: string; t: number }
	| { type: "keystroke"; key: "space"; t: number }
	| { type: "keystroke"; key: "backspace"; t: number }
	| { type: "keystroke"; key: "ctrl_backspace"; t: number }
	| { type: "pong"; t: number };

// Server → Client
export type ServerMessage =
	| { type: "queue_joined"; position: number }
	| { type: "room_created"; code: string }
	| { type: "room_joined"; opponent: string }
	| { type: "match_found"; opponent: string; roomId: string }
	| { type: "countdown"; value: 3 | 2 | 1 }
	| {
			type: "game_start";
			words: string[];
			duration: number;
			startTime: number;
	  }
	| {
			type: "self_stats";
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
	| {
			type: "self_complete";
			wpm: number;
			rawWpm: number;
			accuracy: number;
			score: number;
	  }
	| {
			type: "opponent_progress";
			wordIndex: number;
			charIndex: number;
			wpm: number;
			accuracy: number;
			score: number;
			combo: number;
	  }
	| {
			type: "opponent_complete";
			wpm: number;
			accuracy: number;
			rawWpm: number;
	  }
	| { type: "game_result"; winner: string | null; players: PlayerResult[] }
	| { type: "opponent_disconnected" }
	| { type: "opponent_reconnected" }
	| { type: "error"; message: string }
	| { type: "ping"; t: number };

export interface PlayerResult {
	userId: string;
	name: string;
	wpm: number;
	accuracy: number;
	rawWpm: number;
	completed: boolean;
	score: number;
	completedAt?: number;
}
