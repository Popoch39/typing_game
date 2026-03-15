"use client";

import { ComboDisplay } from "@/components/typing/combo-display";
import { TypingArea } from "@/components/typing/typing-area";
import { OpponentProgress } from "./opponent-progress";

interface MultiplayerPlayingViewProps {
	timeRemaining: number;
	gameDuration: number;
	isRunning: boolean;
	wpm: number;
	accuracy: number;
	score: number;
}

export function MultiplayerPlayingView({
	timeRemaining,
	gameDuration,
	isRunning,
	wpm,
	accuracy,
	score,
}: MultiplayerPlayingViewProps) {
	return (
		<div className="w-full space-y-6">
			<OpponentProgress />
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-6 font-mono text-2xl text-muted-foreground">
					<span className="tabular-nums text-primary">
						{isRunning ? timeRemaining : gameDuration}
					</span>
					{isRunning && (
						<>
							<span className="tabular-nums">{wpm} wpm</span>
							<span className="tabular-nums">{accuracy}%</span>
							<span className="tabular-nums">{score}</span>
						</>
					)}
				</div>
			</div>
			<div className="relative">
				<ComboDisplay />
				<TypingArea />
			</div>
			{!isRunning && (
				<p className="text-center text-sm text-muted-foreground">
					Start typing to begin...
				</p>
			)}
		</div>
	);
}
