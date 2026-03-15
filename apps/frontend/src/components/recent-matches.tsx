"use client";

import { ChevronRight, Swords } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useSession } from "@/hooks/use-auth";
import { useMyMatchHistory } from "@/hooks/use-rating";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

function MatchSkeleton() {
	return (
		<div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
			<div className="flex items-center gap-2 flex-1 min-w-0">
				<Skeleton className="h-9 w-9 rounded-full shrink-0" />
				<div className="space-y-1.5">
					<Skeleton className="h-3.5 w-14" />
					<Skeleton className="h-3 w-10" />
				</div>
			</div>
			<div className="flex items-center gap-1.5 shrink-0">
				<Skeleton className="h-6 w-7 rounded" />
				<Skeleton className="h-3 w-3" />
				<Skeleton className="h-6 w-7 rounded" />
			</div>
			<div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
				<div className="space-y-1.5 flex flex-col items-end">
					<Skeleton className="h-3.5 w-14" />
					<Skeleton className="h-3 w-10" />
				</div>
				<Skeleton className="h-9 w-9 rounded-full shrink-0" />
			</div>
		</div>
	);
}

export function RecentMatches() {
	const { data: session } = useSession();
	const { data: matches, isLoading } = useMyMatchHistory();
	const userId = session?.user?.id;
	const userName = session?.user?.name ?? "You";
	const userImage = session?.user?.image;

	const displayedMatches = matches?.slice(0, 5);

	return (
		<Card className="animate-slide-up elevation-1 hover:elevation-2 transition-all duration-300">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<Swords className="h-4 w-4 text-primary" />
						Recent Matches
					</CardTitle>
					<Link
						href="/history"
						className={cn(
							"text-sm text-primary flex items-center gap-1 group",
							"hover:underline focus-ring rounded-sm",
						)}
					>
						View all
						<ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-2">
						<MatchSkeleton />
						<MatchSkeleton />
						<MatchSkeleton />
					</div>
				) : !displayedMatches?.length ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/50 mb-3">
							<Swords className="h-5 w-5 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium text-foreground">
							No matches yet
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							Start a game to see your history here
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{displayedMatches.map((match, index) => {
							const isPlayer1 = match.player1Id === userId;
							const won = match.winnerId === userId;
							const draw = match.winnerId === null;

							const yourScore = isPlayer1
								? match.player1Score
								: match.player2Score;
							const opponentScore = isPlayer1
								? match.player2Score
								: match.player1Score;
							const opponentName = isPlayer1
								? match.player2Name
								: match.player1Name;

							const ratingBefore = isPlayer1
								? match.player1RatingBefore
								: match.player2RatingBefore;
							const ratingAfter = isPlayer1
								? match.player1RatingAfter
								: match.player2RatingAfter;
							const ratingDiff =
								ratingBefore != null && ratingAfter != null
									? Math.round(ratingAfter - ratingBefore)
									: null;

							return (
								<div
									key={match.id}
									className={cn(
										"relative flex items-center gap-2 p-3 rounded-lg",
										"bg-secondary/30 transition-all duration-200",
										"hover:bg-secondary/50 hover:elevation-1",
										"group overflow-hidden",
									)}
									style={{ animationDelay: `${index * 50}ms` }}
								>
									{/* Result accent line */}
									<div
										className={cn(
											"absolute left-0 top-0 bottom-0 w-0.5",
											draw
												? "bg-yellow-500/60"
												: won
													? "bg-green-500/60"
													: "bg-destructive/60",
										)}
									/>

									{/* You — left */}
									<div className="flex items-center gap-2 flex-1 min-w-0">
										<div className="relative shrink-0">
											<UserAvatar
												name={userName}
												image={userImage}
												size="md"
												ringClassName="ring-primary/50"
											/>
											<span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-primary-foreground ring-2 ring-card">
												ME
											</span>
										</div>
										<div className="min-w-0 hidden sm:block">
											<p className="text-sm font-medium text-foreground truncate">
												{userName}
											</p>
											<p className="text-[11px] text-muted-foreground">
												{timeAgo(match.createdAt)}
											</p>
										</div>
									</div>

									{/* Center — score + LP */}
									<div className="flex flex-col items-center shrink-0 gap-0.5">
										<div className="flex items-baseline gap-1">
											<span
												className={cn(
													"text-lg font-extrabold tabular-nums leading-none",
													won && !draw
														? "text-foreground"
														: "text-muted-foreground",
												)}
											>
												{yourScore}
											</span>
											<span className="text-xs text-muted-foreground/40 font-medium">
												:
											</span>
											<span
												className={cn(
													"text-lg font-extrabold tabular-nums leading-none",
													!won && !draw
														? "text-foreground"
														: "text-muted-foreground",
												)}
											>
												{opponentScore}
											</span>
										</div>
										{ratingDiff != null && (
											<span
												className={cn(
													"text-[10px] font-bold tabular-nums",
													ratingDiff > 0
														? "text-green-500"
														: ratingDiff < 0
															? "text-destructive"
															: "text-muted-foreground",
												)}
											>
												{ratingDiff > 0 ? "+" : ""}
												{ratingDiff} LP
											</span>
										)}
									</div>

									{/* Opponent — right */}
									<div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
										<div className="min-w-0 text-right hidden sm:block">
											<p className="text-sm font-medium text-foreground truncate">
												{opponentName}
											</p>
											<p className="text-[11px] text-muted-foreground">
												{match.mode === "ranked" ? "Ranked" : "Casual"}
											</p>
										</div>
										<UserAvatar name={opponentName} size="md" />
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
