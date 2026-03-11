"use client";

import { useTypingStore } from "@/stores/use-typing-store";

export function TypingStats() {
	const timeRemaining = useTypingStore((s) => s.timeRemaining);
	const wpm = useTypingStore((s) => s.wpm);
	const accuracy = useTypingStore((s) => s.accuracy);
	const isRunning = useTypingStore((s) => s.isRunning);
	const duration = useTypingStore((s) => s.duration);

	return (
		<div className="flex items-center gap-6 font-mono text-2xl text-muted-foreground">
			<span className="tabular-nums text-primary">
				{isRunning ? timeRemaining : duration}
			</span>
			{isRunning && (
				<>
					<span className="tabular-nums">{wpm} wpm</span>
					<span className="tabular-nums">{accuracy}%</span>
				</>
			)}
		</div>
	);
}
