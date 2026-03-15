import { create } from "zustand";
import type { MultiplayerState } from "@/lib/multiplayer-client";

export const useMultiplayerStore = create<MultiplayerState>(() => ({
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
	presence: { online: 0, queuing: 0, inGame: 0 },
	isRanked: false,
	ratingChange: null,
}));
