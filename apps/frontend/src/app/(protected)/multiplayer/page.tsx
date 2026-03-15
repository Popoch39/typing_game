"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CountdownScreen } from "@/components/multiplayer/countdown-screen";
import { GameResultScreen } from "@/components/multiplayer/game-result-screen/game-result-screen";
import { MultiplayerPlayingView } from "@/components/multiplayer/multiplayer-playing-view";
import { useMultiplayerGame } from "@/hooks/use-multiplayer-game";

export default function MultiplayerPage() {
	const router = useRouter();
	const { mp, typingStore, handlePlayAgain } = useMultiplayerGame();

	const shouldRedirect = mp.status === "idle" || mp.status === "connecting";

	useEffect(() => {
		if (shouldRedirect) {
			router.push("/");
		}
	}, [shouldRedirect, router]);

	const handleBackToDashboard = () => {
		router.push("/");
	};

	if (shouldRedirect) {
		return null;
	}

	return (
		<>
			{mp.error && (
				<div className="w-full max-w-md rounded-lg bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
					{mp.error}
				</div>
			)}

			{mp.opponentDisconnected && mp.status === "playing" && (
				<div className="w-full max-w-md rounded-lg bg-yellow-500/10 px-4 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400">
					Opponent disconnected — waiting 5s...
				</div>
			)}

			{mp.status === "countdown" && <CountdownScreen />}

			{mp.status === "playing" && (
				<MultiplayerPlayingView
					timeRemaining={typingStore.timeRemaining}
					gameDuration={mp.gameDuration}
					isRunning={typingStore.isRunning}
					wpm={typingStore.wpm}
					accuracy={typingStore.accuracy}
					score={typingStore.score}
				/>
			)}

			{mp.status === "finished" && (
				<GameResultScreen
					onPlayAgain={handlePlayAgain}
					onBackToDashboard={handleBackToDashboard}
				/>
			)}
		</>
	);
}
