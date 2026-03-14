"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-auth";
import { useMultiplayerStore } from "@/hooks/use-multiplayer";
import { cn } from "@/lib/utils";

export function GameResultScreen({ onPlayAgain }: { onPlayAgain: () => void }) {
	const gameResult = useMultiplayerStore((s) => s.gameResult);
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
					<Link href="/" className="flex-1">
						<Button variant="outline" className="w-full">
							Solo Mode
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
