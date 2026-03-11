"use client";

import { useMultiplayerStore } from "@/hooks/use-multiplayer";

export function CountdownScreen() {
	const countdownValue = useMultiplayerStore((s) => s.countdownValue);
	const opponent = useMultiplayerStore((s) => s.opponent);

	return (
		<div className="flex flex-col items-center gap-6">
			<p className="text-sm text-muted-foreground">
				vs {opponent?.name || "Opponent"}
			</p>
			<div className="font-mono text-8xl font-bold text-primary animate-pulse">
				{countdownValue ?? "..."}
			</div>
			<p className="text-sm text-muted-foreground">Get ready!</p>
		</div>
	);
}
