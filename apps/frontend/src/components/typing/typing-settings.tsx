"use client";

import { cn } from "@/lib/utils";
import { useTypingStore } from "@/stores/use-typing-store";

const DURATIONS = [15, 30, 60, 120];

export function TypingSettings() {
	const duration = useTypingStore((s) => s.duration);
	const setDuration = useTypingStore((s) => s.setDuration);
	const isRunning = useTypingStore((s) => s.isRunning);

	return (
		<div className="flex items-center gap-2">
			{DURATIONS.map((d) => (
				<button
					key={d}
					type="button"
					disabled={isRunning}
					onClick={() => setDuration(d)}
					className={cn(
						"rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
						d === duration
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:text-foreground",
						isRunning && "pointer-events-none opacity-50",
					)}
				>
					{d}
				</button>
			))}
		</div>
	);
}
