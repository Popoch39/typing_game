"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/hooks/use-auth";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002";

/**
 * Lightweight WS connection that only listens for presence_update messages.
 * Skips connecting if a full MultiplayerClient is already connected (status !== "idle").
 */
export function usePresence() {
	const { data: session } = useSession();
	const wsRef = useRef<WebSocket | null>(null);
	const status = useMultiplayerStore((s) => s.status);

	const token = session?.session?.token;

	useEffect(() => {
		// Don't open a second connection if the multiplayer client is already active
		if (status !== "idle" || !token) return;

		const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
		wsRef.current = ws;

		ws.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data);
				if (msg.type === "presence_update") {
					useMultiplayerStore.setState({
						presence: {
							online: msg.online,
							queuing: msg.queuing,
							inGame: msg.inGame,
						},
					});
				}
			} catch {}
		};

		return () => {
			ws.close();
			wsRef.current = null;
		};
	}, [token, status]);

	return useMultiplayerStore((s) => s.presence);
}
