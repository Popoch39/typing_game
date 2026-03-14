"use client";

import { useTypingStore } from "@/stores/use-typing-store";
import { usePerfectScore } from "./hooks/use-perfect-score";

export function TypingStats() {
	const timeRemaining = useTypingStore((s) => s.timeRemaining);
	const wpm = useTypingStore((s) => s.wpm);
	const accuracy = useTypingStore((s) => s.accuracy);
	const isRunning = useTypingStore((s) => s.isRunning);
	const duration = useTypingStore((s) => s.duration);
	const score = useTypingStore((s) => s.score);
	const words = useTypingStore((s) => s.words);
	const currentWordIndex = useTypingStore((s) => s.currentWordIndex);

	const perfectScore = usePerfectScore(words, currentWordIndex);

	return (
		<div className="flex items-center gap-6 font-mono text-2xl text-muted-foreground">
			<span className="tabular-nums text-primary">
				{isRunning ? timeRemaining : duration}
			</span>
			{isRunning && (
				<>
					<span className="tabular-nums">{wpm} wpm</span>
					<span className="tabular-nums">{accuracy}%</span>
					<span className="tabular-nums">
						{score}
						{perfectScore > 0 && (
							<span className="text-lg text-muted-foreground/50">
								{" / "}
								{perfectScore}
							</span>
						)}
					</span>
				</>
			)}
		</div>
	);
}
