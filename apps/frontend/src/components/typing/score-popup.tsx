"use client";

import { useScorePopups } from "./hooks/use-score-popups";

export function ScorePopup() {
	const popups = useScorePopups();

	return (
		<div className="pointer-events-none absolute -top-8 right-0 z-20">
			{popups.map((p) => (
				<div
					key={p.id}
					className="animate-score-popup whitespace-nowrap font-mono text-sm font-bold text-primary"
				>
					+{p.score}
					{p.isPerfect ? " PERFECT!" : ""}
				</div>
			))}
		</div>
	);
}
