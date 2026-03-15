"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "@/hooks/use-auth";
import { useMultiplayer, useMultiplayerStore } from "@/hooks/use-multiplayer";
import { TypingEngine } from "@/lib/typing-engine";
import { useTypingStore } from "@/stores/use-typing-store";

export function useMultiplayerGame() {
	const { data: session } = useSession();
	const mp = useMultiplayer();
	const typingStore = useTypingStore();
	const connectedRef = useRef(false);
	const engineRef = useRef<TypingEngine | null>(null);

	const sessionToken = session?.session?.token;

	// Connect WS on mount — skip if already connected (navigated from dashboard)
	// biome-ignore lint/correctness/useExhaustiveDependencies: mp methods are stable singleton refs
	useEffect(() => {
		if (!sessionToken || connectedRef.current) return;
		const currentStatus = useMultiplayerStore.getState().status;
		// If already in a game state, the dashboard already connected the shared client
		if (currentStatus !== "idle") {
			connectedRef.current = true;
			return;
		}
		mp.connect(sessionToken);
		connectedRef.current = true;

		return () => {
			mp.disconnect();
			connectedRef.current = false;
		};
	}, [sessionToken]);

	// Initialize typing engine when game starts (local visual only)
	useEffect(() => {
		if (mp.status !== "playing" || !mp.gameWords || !mp.gameDuration) return;

		const syncFromEngine = useTypingStore.getState().syncFromEngine;
		const syncStatsOnly = useTypingStore.getState().syncStatsOnly;

		const engine = new TypingEngine(mp.gameWords, mp.gameDuration, "words", {
			onStateChange: syncFromEngine,
			onTick: syncStatsOnly,
			onComplete: () => {
				// Local engine completion is ignored in multiplayer —
				// the server is authoritative via self_complete
				syncFromEngine();
			},
		});

		engineRef.current = engine;
		useTypingStore.setState({ engine });
		syncFromEngine();

		return () => {
			engine.destroy();
			engineRef.current = null;
		};
	}, [mp.status, mp.gameWords, mp.gameDuration]);

	// Override local stats with server-authoritative stats
	// biome-ignore lint/correctness/useExhaustiveDependencies: mp.selfStats triggers the sync
	useEffect(() => {
		const selfStats = useMultiplayerStore.getState().selfStats;
		if (!selfStats) return;

		useTypingStore.setState({
			wpm: selfStats.wpm,
			rawWpm: selfStats.rawWpm,
			accuracy: selfStats.accuracy,
			score: selfStats.score,
			combo: selfStats.combo,
			lastWordScore: selfStats.lastWordScore,
		});
	}, [mp.selfStats]);

	// Handle server-authoritative completion
	useEffect(() => {
		if (!mp.selfComplete) return;

		useTypingStore.setState({ isComplete: true });
	}, [mp.selfComplete]);

	// Keyboard handler for game — routes to local engine + sends keystroke to server
	// biome-ignore lint/correctness/useExhaustiveDependencies: mp.sendKeystroke is a stable singleton ref
	useEffect(() => {
		if (mp.status !== "playing") return;

		const handler = (e: KeyboardEvent) => {
			const engine = engineRef.current;
			if (!engine) return;

			const state = engine.getState();
			if (state.isComplete) return;

			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			)
				return;

			if (e.key === "Backspace") {
				e.preventDefault();
				if (e.ctrlKey) {
					engine.handleCtrlBackspace();
					mp.sendKeystroke({ key: "ctrl_backspace" });
				} else {
					engine.handleBackspace();
					mp.sendKeystroke({ key: "backspace" });
				}
			} else if (e.key === " ") {
				e.preventDefault();
				engine.handleSpace();
				mp.sendKeystroke({ key: "space" });
			} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
				engine.handleChar(e.key);
				mp.sendKeystroke({ key: "char", char: e.key });
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [mp.status]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: mp methods are stable singleton refs
	const handlePlayAgain = useCallback(() => {
		if (engineRef.current) {
			engineRef.current.destroy();
			engineRef.current = null;
		}
		mp.disconnect();
		connectedRef.current = false;

		const token = session?.session.token;
		if (token) {
			mp.connect(token);
			connectedRef.current = true;
		}
	}, [session]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: mp methods are stable singleton refs
	const handleCancel = useCallback(() => {
		mp.leaveQueue();
		mp.leaveRankedQueue();
		mp.disconnect();
		connectedRef.current = false;
		const token = session?.session.token;
		if (token) {
			mp.connect(token);
			connectedRef.current = true;
		}
	}, [session]);

	return { mp, typingStore, handlePlayAgain, handleCancel };
}
