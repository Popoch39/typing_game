import { UserAvatar } from "@/components/user-avatar";
import type { MatchResult } from "@/hooks/use-rating";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

interface MatchRowProps {
	match: MatchResult;
	userId: string;
	userName: string;
	userImage?: string | null;
	index: number;
}

export function MatchRow({
	match,
	userId,
	userName,
	userImage,
	index,
}: MatchRowProps) {
	const isPlayer1 = match.player1Id === userId;
	const won = match.winnerId === userId;
	const draw = match.winnerId === null;

	const yourScore = isPlayer1 ? match.player1Score : match.player2Score;
	const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
	const opponentName = isPlayer1 ? match.player2Name : match.player1Name;

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
							won && !draw ? "text-foreground" : "text-muted-foreground",
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
							!won && !draw ? "text-foreground" : "text-muted-foreground",
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
}
