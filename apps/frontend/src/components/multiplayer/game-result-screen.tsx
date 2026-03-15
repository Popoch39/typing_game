"use client";

import { getRankFromRating, getTierColor } from "@repo/shared";
import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";

function RatingChangeBadge({
	change,
	oldRating,
	newRating,
}: {
	change: number;
	oldRating?: number;
	newRating?: number;
}) {
	const ref = useRef<HTMLSpanElement>(null);

	const oldRank = oldRating != null ? getRankFromRating(oldRating) : null;
	const newRank = newRating != null ? getRankFromRating(newRating) : null;
	const promoted =
		oldRank &&
		newRank &&
		(oldRank.tier !== newRank.tier || oldRank.division !== newRank.division);

	useEffect(() => {
		if (!ref.current) return;
		gsap.fromTo(
			ref.current,
			{ textContent: "0" },
			{
				textContent: Math.round(change),
				duration: 0.8,
				ease: "power2.out",
				snap: { textContent: 1 },
				onUpdate() {
					if (!ref.current) return;
					const val = Number.parseInt(ref.current.textContent || "0", 10);
					ref.current.textContent = `${val >= 0 ? "+" : ""}${val}`;
				},
			},
		);
	}, [change]);

	return (
		<div className="mt-2 space-y-1">
			<div
				className={cn(
					"font-mono text-lg font-bold",
					change >= 0 ? "text-emerald-500" : "text-red-500",
				)}
			>
				<span ref={ref}>
					{change >= 0 ? "+" : ""}
					{Math.round(change)}
				</span>
				<span className="ml-1 text-xs text-muted-foreground">ELO</span>
			</div>
			{newRank && (
				<div className="text-xs">
					{promoted && oldRank && (
						<span
							className="text-muted-foreground line-through"
							style={{ color: getTierColor(oldRank.tier) }}
						>
							{oldRank.tierLabel}
						</span>
					)}
					<span
						className="ml-1 font-semibold"
						style={{ color: getTierColor(newRank.tier) }}
					>
						{newRank.tierLabel}
					</span>
					<span className="ml-1 font-mono text-muted-foreground">
						{newRank.lp} LP
					</span>
				</div>
			)}
		</div>
	);
}

export function GameResultScreen({
	onPlayAgain,
	onBackToDashboard,
}: {
	onPlayAgain: () => void;
	onBackToDashboard?: () => void;
}) {
	const gameResult = useMultiplayerStore((s) => s.gameResult);
	const isRanked = useMultiplayerStore((s) => s.isRanked);
	const ratingChange = useMultiplayerStore((s) => s.ratingChange);
	const { data: session } = useSession();

	if (!gameResult) return null;

	const myResult = gameResult.players.find(
		(p) => p.userId === session?.user.id,
	);
	const oppResult = gameResult.players.find(
		(p) => p.userId !== session?.user.id,
	);

	const isWinner = gameResult.winner === session?.user.id;
	const isTie = gameResult.winner === null;

	const myRatingChange = ratingChange?.find(
		(r) => r.userId === session?.user.id,
	);
	const oppRatingChange = ratingChange?.find(
		(r) => r.userId !== session?.user.id,
	);

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle className="text-center">
					{isTie ? "Tie!" : isWinner ? "You won!" : "You lost!"}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid grid-cols-2 gap-4">
					{/* My result */}
					<div
						className={cn(
							"space-y-2 rounded-lg p-3 text-center",
							isWinner && "ring-2 ring-primary",
						)}
					>
						<p className="text-sm font-medium">You</p>
						<p className="font-mono text-3xl font-bold text-primary">
							{myResult?.score ?? 0}
						</p>
						<p className="text-xs text-muted-foreground">score</p>
						{myResult && (
							<div className="space-y-0.5 text-xs text-muted-foreground">
								<p>Mots : {myResult.wordPoints ?? 0}</p>
								<p>WPM : {myResult.wpmBonus ?? 0}</p>
								{(myResult.timeBonus ?? 0) > 0 && (
									<p>Temps : {myResult.timeBonus}</p>
								)}
							</div>
						)}
						{isRanked && myRatingChange && (
							<RatingChangeBadge
								change={myRatingChange.change}
								oldRating={myRatingChange.oldRating}
								newRating={myRatingChange.newRating}
							/>
						)}
						<div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
							<div>
								<p className="font-mono font-semibold text-foreground">
									{myResult?.wpm ?? 0}
								</p>
								<p>wpm</p>
							</div>
							<div>
								<p className="font-mono font-semibold text-foreground">
									{myResult?.rawWpm ?? 0}
								</p>
								<p>raw</p>
							</div>
							<div>
								<p className="font-mono font-semibold text-foreground">
									{myResult?.accuracy ?? 0}%
								</p>
								<p>acc</p>
							</div>
						</div>
					</div>

					{/* Opponent result */}
					<div
						className={cn(
							"space-y-2 rounded-lg p-3 text-center",
							!isWinner && !isTie && "ring-2 ring-primary",
						)}
					>
						<p className="text-sm font-medium">
							{oppResult?.name || "Opponent"}
						</p>
						<p className="font-mono text-3xl font-bold text-primary">
							{oppResult?.score ?? 0}
						</p>
						<p className="text-xs text-muted-foreground">score</p>
						{oppResult && (
							<div className="space-y-0.5 text-xs text-muted-foreground">
								<p>Mots : {oppResult.wordPoints ?? 0}</p>
								<p>WPM : {oppResult.wpmBonus ?? 0}</p>
								{(oppResult.timeBonus ?? 0) > 0 && (
									<p>Temps : {oppResult.timeBonus}</p>
								)}
							</div>
						)}
						{isRanked && oppRatingChange && (
							<RatingChangeBadge
								change={oppRatingChange.change}
								oldRating={oppRatingChange.oldRating}
								newRating={oppRatingChange.newRating}
							/>
						)}
						<div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
							<div>
								<p className="font-mono font-semibold text-foreground">
									{oppResult?.wpm ?? 0}
								</p>
								<p>wpm</p>
							</div>
							<div>
								<p className="font-mono font-semibold text-foreground">
									{oppResult?.rawWpm ?? 0}
								</p>
								<p>raw</p>
							</div>
							<div>
								<p className="font-mono font-semibold text-foreground">
									{oppResult?.accuracy ?? 0}%
								</p>
								<p>acc</p>
							</div>
						</div>
					</div>
				</div>

				<div className="flex gap-3">
					<Button className="flex-1" variant="outline" onClick={onPlayAgain}>
						Play Again
					</Button>
					{onBackToDashboard ? (
						<Button
							className="flex-1"
							variant="outline"
							onClick={onBackToDashboard}
						>
							Dashboard
						</Button>
					) : (
						<Link href="/" className="flex-1">
							<Button variant="outline" className="w-full">
								Solo Mode
							</Button>
						</Link>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
