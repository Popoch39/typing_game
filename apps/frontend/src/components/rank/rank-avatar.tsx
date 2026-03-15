"use client";

import { getRankFromLp, type RankTier } from "@/lib/rank";
import { cn } from "@/lib/utils";

interface RankAvatarProps {
	initials: string;
	lp?: number;
	tier?: RankTier;
	size?: "sm" | "md" | "lg";
	showStatus?: boolean;
	status?: "online" | "offline" | "in-game" | "away";
	className?: string;
}

export function RankAvatar({
	initials,
	lp = 4078,
	tier,
	size = "md",
	showStatus = false,
	status = "online",
	className,
}: RankAvatarProps) {
	const rank = tier ? getRankFromLp(lp) : getRankFromLp(lp);

	const sizes = {
		sm: {
			container: "h-8 w-8",
			text: "text-xs",
			ring: "ring-[1.5px] ring-offset-1",
			status: "h-2.5 w-2.5 border-[1.5px]",
		},
		md: {
			container: "h-10 w-10",
			text: "text-sm",
			ring: "ring-2 ring-offset-2",
			status: "h-3 w-3 border-2",
		},
		lg: {
			container: "h-14 w-14",
			text: "text-lg",
			ring: "ring-[2.5px] ring-offset-2",
			status: "h-3.5 w-3.5 border-2",
		},
	};

	const statusColors = {
		online: "bg-green-500",
		offline: "bg-muted-foreground",
		"in-game": "bg-orange-500",
		away: "bg-yellow-500",
	};

	const s = sizes[size];

	return (
		<div className="relative">
			<div
				className={cn(
					"rounded-full flex items-center justify-center",
					"ring-offset-background transition-all duration-200",
					rank.bgColor,
					rank.ringColor,
					s.container,
					s.ring,
					className,
				)}
			>
				<span className={cn("font-bold", s.text, rank.color)}>{initials}</span>
			</div>
			{showStatus && (
				<div
					className={cn(
						"absolute -bottom-0.5 -right-0.5 rounded-full border-background",
						statusColors[status],
						s.status,
					)}
				/>
			)}
		</div>
	);
}
