"use client";

import { RankBadge } from "@/components/rank/rank-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeaderboard } from "@/hooks/use-rating";

export default function LeaderboardPage() {
	const { data: leaderboard, isLoading } = useLeaderboard();

	return (
		<div className="w-full">
			<Card>
				<CardHeader>
					<CardTitle>Ranked Leaderboard</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className="text-sm text-muted-foreground">Loading...</p>
					) : !leaderboard?.length ? (
						<p className="text-sm text-muted-foreground">
							No ranked players yet. Be the first!
						</p>
					) : (
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-muted-foreground">
									<th className="pb-2 text-left font-medium">#</th>
									<th className="pb-2 text-left font-medium">Player</th>
									<th className="pb-2 text-right font-medium">Rank</th>
									<th className="pb-2 text-right font-medium">Games</th>
								</tr>
							</thead>
							<tbody>
								{leaderboard.map((entry, i) => (
									<tr key={entry.userId} className="border-b last:border-0">
										<td className="py-2 font-mono text-muted-foreground">
											{i + 1}
										</td>
										<td className="py-2 font-medium">{entry.name}</td>
										<td className="py-2 text-right">
											<div className="flex items-center justify-end gap-2">
												<RankBadge rating={entry.rating} compact />
												<span className="font-mono text-xs text-muted-foreground">
													({Math.round(entry.rating)})
												</span>
											</div>
										</td>
										<td className="py-2 text-right font-mono text-muted-foreground">
											{entry.gamesPlayed}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
