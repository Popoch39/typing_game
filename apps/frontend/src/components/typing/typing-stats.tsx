"use client";

import { useTypingStore } from "@/stores/use-typing-store";
import { cn } from "@/lib/utils";

function getComboColor(combo: number): string {
	if (combo >= 5.0) return "text-red-500";
	if (combo >= 3.5) return "text-orange-500";
	if (combo >= 2.0) return "text-yellow-500";
	return "text-muted-foreground";
}

export function TypingStats() {
	const timeRemaining = useTypingStore((s) => s.timeRemaining);
	const wpm = useTypingStore((s) => s.wpm);
	const accuracy = useTypingStore((s) => s.accuracy);
	const isRunning = useTypingStore((s) => s.isRunning);
	const duration = useTypingStore((s) => s.duration);
	const score = useTypingStore((s) => s.score);
	const combo = useTypingStore((s) => s.combo);

	return (
		<div className="flex items-center gap-6 font-mono text-2xl text-muted-foreground">
			<span className="tabular-nums text-primary">
				{isRunning ? timeRemaining : duration}
			</span>
			{isRunning && (
				<>
					<span className="tabular-nums">{wpm} wpm</span>
					<span className="tabular-nums">{accuracy}%</span>
					<span className="tabular-nums">{score}</span>
					<span
						className={cn(
							"tabular-nums text-lg font-bold transition-all duration-200",
							getComboColor(combo),
							combo >= 5.0 && "animate-pulse",
						)}
					>
						{combo.toFixed(2)}x
					</span>
				</>
			)}
		</div>
	);
}
