"use client";

import { useEffect, useState } from "react";
import { useTypingStore } from "@/stores/use-typing-store";

interface PopupEntry {
	id: number;
	score: number;
	isPerfect: boolean;
}

let nextId = 0;

export function ScorePopup() {
	const [popups, setPopups] = useState<PopupEntry[]>([]);
	const lastWordScore = useTypingStore((s) => s.lastWordScore);
	const lastWordIsPerfect = useTypingStore((s) => s.lastWordIsPerfect);
	const isRunning = useTypingStore((s) => s.isRunning);

	useEffect(() => {
		if (lastWordScore === 0 || !isRunning) return;

		const id = nextId++;
		setPopups((prev) => [...prev, { id, score: lastWordScore, isPerfect: lastWordIsPerfect }]);

		const timer = setTimeout(() => {
			setPopups((prev) => prev.filter((p) => p.id !== id));
		}, 1000);

		return () => clearTimeout(timer);
	}, [lastWordScore, lastWordIsPerfect, isRunning]);

	return (
		<div className="pointer-events-none absolute -top-8 right-0 z-20">
			{popups.map((p) => (
				<div
					key={p.id}
					className="animate-score-popup whitespace-nowrap font-mono text-sm font-bold text-primary"
				>
					+{p.score}{p.isPerfect ? " PERFECT!" : ""}
				</div>
			))}
		</div>
	);
}
