"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

interface ScorePayload {
	wpm: number;
	rawWpm: number;
	accuracy: number;
	duration: number;
	mode: string;
	correctChars: number;
	incorrectChars: number;
	totalCharsTyped: number;
}

interface Score extends ScorePayload {
	id: string;
	userId: string;
	createdAt: string;
}

export function useSaveScore() {
	return useMutation({
		mutationFn: async (payload: ScorePayload): Promise<Score> => {
			const res = await fetch("/api/game/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to save score");
			return res.json();
		},
	});
}

export function useScores() {
	return useQuery<Score[]>({
		queryKey: ["scores"],
		queryFn: async () => {
			const res = await fetch("/api/game/scores");
			if (!res.ok) throw new Error("Failed to fetch scores");
			return res.json();
		},
	});
}

export function useLeaderboard(duration?: number) {
	return useQuery<Score[]>({
		queryKey: ["leaderboard", duration],
		queryFn: async () => {
			const params = duration ? `?duration=${duration}` : "";
			const res = await fetch(`/api/game/leaderboard${params}`);
			if (!res.ok) throw new Error("Failed to fetch leaderboard");
			return res.json();
		},
	});
}
