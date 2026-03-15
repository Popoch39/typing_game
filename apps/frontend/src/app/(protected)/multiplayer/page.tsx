"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CountdownScreen } from "@/components/multiplayer/countdown-screen";
import { GameResultScreen } from "@/components/multiplayer/game-result-screen/game-result-screen";
import { OpponentProgress } from "@/components/multiplayer/opponent-progress";
import { ComboDisplay } from "@/components/typing/combo-display";
import { TypingArea } from "@/components/typing/typing-area";
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
				<div className="w-full space-y-6">
					<OpponentProgress />
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-6 font-mono text-2xl text-muted-foreground">
							<span className="tabular-nums text-primary">
								{typingStore.isRunning
									? typingStore.timeRemaining
									: mp.gameDuration}
							</span>
							{typingStore.isRunning && (
								<>
									<span className="tabular-nums">{typingStore.wpm} wpm</span>
									<span className="tabular-nums">{typingStore.accuracy}%</span>
									<span className="tabular-nums">{typingStore.score}</span>
								</>
							)}
						</div>
					</div>
					<div className="relative">
						<ComboDisplay />
						<TypingArea />
					</div>
					{!typingStore.isRunning && (
						<p className="text-center text-sm text-muted-foreground">
							Start typing to begin...
						</p>
					)}
				</div>
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
