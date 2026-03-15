"use client";

import { getRankFromRating } from "@repo/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";

interface Rating {
	userId: string;
	rating: number;
	rd: number;
	volatility?: number;
	gamesPlayed: number;
}

export function useRating() {
	const queryClient = useQueryClient();
	const ratingChange = useMultiplayerStore((s) => s.ratingChange);

	const query = useQuery<Rating>({
		queryKey: ["rating"],
		queryFn: async () => {
			const res = await fetch("/api/rating");
			if (!res.ok) throw new Error("Failed to fetch rating");
			return res.json();
		},
	});

	// Invalidate on rating change from WS
	useEffect(() => {
		if (ratingChange) {
			queryClient.invalidateQueries({ queryKey: ["rating"] });
		}
	}, [ratingChange, queryClient]);

	const rankInfo = useMemo(
		() => (query.data ? getRankFromRating(query.data.rating) : null),
		[query.data],
	);

	return { ...query, rankInfo };
}

export function useLeaderboard() {
	return useQuery<
		{ userId: string; name: string; rating: number; gamesPlayed: number }[]
	>({
		queryKey: ["leaderboard"],
		queryFn: async () => {
			const res = await fetch("/api/rating/leaderboard");
			if (!res.ok) throw new Error("Failed to fetch leaderboard");
			return res.json();
		},
	});
}

export interface MatchResult {
	id: string;
	roomId: string;
	player1Id: string;
	player2Id: string;
	winnerId: string | null;
	player1Score: number;
	player2Score: number;
	player1Wpm: number;
	player2Wpm: number;
	player1Accuracy: number;
	player2Accuracy: number;
	player1RatingBefore: number | null;
	player1RatingAfter: number | null;
	player2RatingBefore: number | null;
	player2RatingAfter: number | null;
	mode: string;
	duration: number;
	createdAt: string;
	player1Name: string;
	player2Name: string;
}

export function useMatchHistory(userId: string) {
	return useQuery<MatchResult[]>({
		queryKey: ["match-history", userId],
		queryFn: async () => {
			const res = await fetch(`/api/rating/match-history/${userId}`);
			if (!res.ok) throw new Error("Failed to fetch match history");
			return res.json();
		},
		enabled: !!userId,
	});
}

export function useMyMatchHistory() {
	return useQuery<MatchResult[]>({
		queryKey: ["match-history", "me"],
		queryFn: async () => {
			const res = await fetch("/api/rating/match-history/me");
			if (!res.ok) throw new Error("Failed to fetch match history");
			return res.json();
		},
	});
}
