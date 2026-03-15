"use client";

import { ChevronRight, Swords } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-auth";
import { useMyMatchHistory } from "@/hooks/use-rating";
import { cn } from "@/lib/utils";
import { MatchRow } from "./match-row";
import { MatchSkeleton } from "./match-skeleton";

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
						{displayedMatches.map((match, index) => (
							<MatchRow
								key={match.id}
								match={match}
								userId={userId ?? ""}
								userName={userName}
								userImage={userImage}
								index={index}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
