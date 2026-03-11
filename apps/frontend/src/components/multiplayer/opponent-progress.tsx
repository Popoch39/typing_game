"use client";

import { useMultiplayerStore } from "@/hooks/use-multiplayer";

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
					{opponent.wpm} wpm · {opponent.accuracy}%
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
					Opponent finished — {opponent.wpm} wpm
				</p>
			)}
		</div>
	);
}
