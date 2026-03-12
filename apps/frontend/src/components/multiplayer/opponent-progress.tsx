"use client";

import { useMultiplayerStore } from "@/hooks/use-multiplayer";
import { cn } from "@/lib/utils";

function getComboColor(combo: number): string {
	if (combo >= 5.0) return "text-red-500";
	if (combo >= 3.5) return "text-orange-500";
	if (combo >= 2.0) return "text-yellow-500";
	return "text-muted-foreground";
}

export function OpponentProgress() {
	const opponent = useMultiplayerStore((s) => s.opponent);
	const gameWords = useMultiplayerStore((s) => s.gameWords);

	if (!opponent || !gameWords) return null;

	const totalWords = gameWords.length;
	const progress = totalWords > 0 ? (opponent.wordIndex / totalWords) * 100 : 0;

	return (
		<div className="w-full space-y-2">
			<div className="flex items-center justify-between text-sm">
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
			<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary/50 transition-all duration-300"
					style={{ width: `${Math.min(progress, 100)}%` }}
				/>
			</div>
			{opponent.completed && (
				<p className="text-center text-xs text-muted-foreground">
					Opponent finished — {opponent.wpm} wpm · {opponent.score} pts
				</p>
			)}
		</div>
	);
}
