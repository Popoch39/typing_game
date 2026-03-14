import { useEffect, useState } from "react";
import { useTypingStore } from "@/stores/use-typing-store";

export interface PopupEntry {
	id: number;
	score: number;
	isPerfect: boolean;
}

let nextId = 0;

export function useScorePopups() {
	const [popups, setPopups] = useState<PopupEntry[]>([]);
	const lastWordScore = useTypingStore((s) => s.lastWordScore);
	const lastWordIsPerfect = useTypingStore((s) => s.lastWordIsPerfect);
	const isRunning = useTypingStore((s) => s.isRunning);

	useEffect(() => {
		if (lastWordScore === 0 || !isRunning) return;

		const id = nextId++;
		setPopups((prev) => [
			...prev,
			{ id, score: lastWordScore, isPerfect: lastWordIsPerfect },
		]);

		const timer = setTimeout(() => {
			setPopups((prev) => prev.filter((p) => p.id !== id));
		}, 1000);

		return () => clearTimeout(timer);
	}, [lastWordScore, lastWordIsPerfect, isRunning]);

	return popups;
}
