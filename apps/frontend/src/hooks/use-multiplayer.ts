"use client";

import { useEffect, useRef } from "react";
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

// --- Hook ---

export function useMultiplayer() {
	const clientRef = useRef<MultiplayerClient | null>(null);
	const store = useMultiplayerStore();

	// Lazily create client
	if (!clientRef.current) {
		clientRef.current = new MultiplayerClient({
			onStateChange: (state) => useMultiplayerStore.setState(state),
		});
	}

	const client = clientRef.current;

	// Cleanup on unmount — don't null the ref so strict mode
	// re-run of effects can still use the same client instance
	useEffect(() => {
		return () => {
			clientRef.current?.destroy();
		};
	}, []);

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
	};
}
