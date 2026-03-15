"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-auth";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";
import { PlayerResultCard } from "./player-result-card";

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
					<PlayerResultCard
						label="You"
						score={myResult?.score ?? 0}
						wordPoints={myResult?.wordPoints}
						wpmBonus={myResult?.wpmBonus}
						timeBonus={myResult?.timeBonus}
						wpm={myResult?.wpm ?? 0}
						rawWpm={myResult?.rawWpm ?? 0}
						accuracy={myResult?.accuracy ?? 0}
						isHighlighted={isWinner}
						ratingChange={myRatingChange}
						isRanked={isRanked}
					/>
					<PlayerResultCard
						label="Opponent"
						name={oppResult?.name}
						score={oppResult?.score ?? 0}
						wordPoints={oppResult?.wordPoints}
						wpmBonus={oppResult?.wpmBonus}
						timeBonus={oppResult?.timeBonus}
						wpm={oppResult?.wpm ?? 0}
						rawWpm={oppResult?.rawWpm ?? 0}
						accuracy={oppResult?.accuracy ?? 0}
						isHighlighted={!isWinner && !isTie}
						ratingChange={oppRatingChange}
						isRanked={isRanked}
					/>
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
