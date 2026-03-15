"use client";

import { ComboDisplay } from "@/components/typing/combo-display";
import { TypingArea } from "@/components/typing/typing-area";
import { cn } from "@/lib/utils";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";
import { OpponentTypingArea } from "./opponent-typing-area";

function getComboColor(combo: number): string {
	if (combo >= 3.0) return "text-red-500";
	if (combo >= 2.25) return "text-orange-500";
	if (combo >= 1.75) return "text-yellow-500";
	return "text-muted-foreground";
}

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
	const opponent = useMultiplayerStore((s) => s.opponent);
	const gameWords = useMultiplayerStore((s) => s.gameWords);

	return (
		<div className="w-full space-y-6">
			{opponent && gameWords && (
				<div className="opacity-50">
					<div className="mb-2 flex items-center justify-between text-sm">
						<span className="text-muted-foreground">
							{opponent.name || "Opponent"}
						</span>
						<span className="font-mono text-muted-foreground">
							{opponent.wpm} wpm · {opponent.accuracy}% ·{" "}
							<span className="text-foreground">{opponent.score}</span>{" "}
							<span className={cn("font-bold", getComboColor(opponent.combo))}>
								{opponent.combo.toFixed(2)}x
							</span>
						</span>
					</div>
					<OpponentTypingArea
						words={gameWords}
						wordIndex={opponent.wordIndex}
						charIndex={opponent.charIndex}
					/>
					{opponent.completed && (
						<p className="mt-1 text-center text-xs text-muted-foreground">
							Opponent finished — {opponent.wpm} wpm · {opponent.score} pts
						</p>
					)}
				</div>
			)}
			<div className="h-px bg-border" />
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
