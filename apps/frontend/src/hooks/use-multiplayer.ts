"use client";

import {
	MultiplayerClient,
	type MultiplayerState,
	type MultiplayerStatus,
	type OpponentState,
	type SelfStats,
} from "@/lib/multiplayer-client";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";

// Re-export types for consumer compatibility
export type { MultiplayerStatus, OpponentState, MultiplayerState, SelfStats };

// Re-export store for selector usage
export { useMultiplayerStore };

// --- Singleton client shared across all components ---

let sharedClient: MultiplayerClient | null = null;

function getClient(): MultiplayerClient {
	if (!sharedClient) {
		sharedClient = new MultiplayerClient({
			onStateChange: (state) => useMultiplayerStore.setState(state),
		});
	}
	return sharedClient;
}

// --- Hook ---

export function useMultiplayer() {
	const store = useMultiplayerStore();
	const client = getClient();

	return {
		...store,
		connect: (token: string) => client.connect(token),
		disconnect: () => client.disconnect(),
		joinQueue: (duration: number) => client.joinQueue(duration),
		leaveQueue: () => client.leaveQueue(),
		createRoom: (duration: number) => client.createRoom(duration),
		joinRoom: (code: string) => client.joinRoom(code),
		sendKeystroke: (
			data:
				| { key: "char"; char: string }
				| { key: "space" }
				| { key: "backspace" }
				| { key: "ctrl_backspace" },
		) => client.sendKeystroke(data),
		joinRankedQueue: (duration: number) => client.joinRankedQueue(duration),
		leaveRankedQueue: () => client.leaveRankedQueue(),
	};
}
