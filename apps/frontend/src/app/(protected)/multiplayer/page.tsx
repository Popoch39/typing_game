"use client";

import { CountdownScreen } from "@/components/multiplayer/countdown-screen";
import { GameResultScreen } from "@/components/multiplayer/game-result-screen";
import { LobbyScreen } from "@/components/multiplayer/lobby-screen";
import { OpponentProgress } from "@/components/multiplayer/opponent-progress";
import { WaitingScreen } from "@/components/multiplayer/waiting-screen";
import { ComboDisplay } from "@/components/typing/combo-display";
import { TypingArea } from "@/components/typing/typing-area";
import { useMultiplayerGame } from "@/hooks/use-multiplayer-game";

export default function MultiplayerPage() {
	const { mp, typingStore, handlePlayAgain, handleCancel } =
		useMultiplayerGame();

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

			{(mp.status === "idle" || mp.status === "connecting") && (
				<LobbyScreen
					onJoinQueue={mp.joinQueue}
					onJoinRankedQueue={mp.joinRankedQueue}
					onCreateRoom={mp.createRoom}
					onJoinRoom={mp.joinRoom}
				/>
			)}

			{(mp.status === "queuing" || mp.status === "in_room") && (
				<WaitingScreen onCancel={handleCancel} />
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
					{process.env.NODE_ENV !== "production" && mp.selfStats && (
						<div className="rounded-md border border-dashed border-yellow-500/50 bg-yellow-500/5 px-3 py-2 font-mono text-xs text-yellow-600 dark:text-yellow-400">
							<span className="font-semibold">DEBUG</span>
							{" | "}
							time correction:{" "}
							<span
								className={
									mp.selfStats.timeCorrection !== 0
										? "text-red-500 font-bold"
										: ""
								}
							>
								{mp.selfStats.timeCorrection}ms
							</span>
						</div>
					)}
				</div>
			)}

			{mp.status === "finished" && (
				<GameResultScreen onPlayAgain={handlePlayAgain} />
			)}
		</>
	);
}
