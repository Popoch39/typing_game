"use client";

import { getRankFromRating } from "@repo/shared";
import { Crown, Flame, Gem, Shield, Star } from "lucide-react";
import { getRankFromLp, type RankTier, rankTiers } from "@/lib/rank";
import { cn } from "@/lib/utils";

const rankIcons: Record<RankTier, React.ElementType> = {
	Bronze: Shield,
	Silver: Shield,
	Gold: Crown,
	Platinum: Gem,
	Diamond: Gem,
	Master: Star,
	Grandmaster: Flame,
};

interface RankBadgeProps {
	lp?: number;
	rating?: number;
	tier?: RankTier;
	division?: string;
	size?: "sm" | "md" | "lg";
	showLp?: boolean;
	compact?: boolean;
	className?: string;
}

export function RankBadge({
	lp = 4078,
	rating,
	tier,
	division,
	size = "md",
	showLp = false,
	compact = false,
	className,
}: RankBadgeProps) {
	const rank = rating
		? (() => {
				const r = getRankFromRating(rating);
				const t = r.tier as RankTier;
				const tierData = getRankFromLp(rankTiers[t].minLp);
				return { ...tierData, tier: t, division: r.division ?? "I", lp: r.lp };
			})()
		: tier
			? { ...getRankFromLp(lp), tier, division: division || "II" }
			: getRankFromLp(lp);

	const Icon = rankIcons[rank.tier];

	const sizes = {
		sm: {
			container: "gap-1.5 px-2 py-1",
			icon: "h-3.5 w-3.5",
			text: "text-xs",
			lpText: "text-[10px]",
		},
		md: {
			container: "gap-2 px-3 py-1.5",
			icon: "h-4 w-4",
			text: "text-sm",
			lpText: "text-xs",
		},
		lg: {
			container: "gap-2.5 px-4 py-2",
			icon: "h-5 w-5",
			text: "text-base",
			lpText: "text-sm",
		},
	};

	const s = sizes[size];

	if (compact) {
		return (
			<span className={cn("inline-flex items-center gap-1", className)}>
				<Icon className={cn("h-3.5 w-3.5", rank.color)} />
				<span className={cn("text-xs font-semibold", rank.color)}>
					{rank.tier} {rank.division}
				</span>
			</span>
		);
	}

	return (
		<div
			className={cn(
				"inline-flex items-center rounded-lg border transition-all duration-200",
				"hover:elevation-1",
				rank.bgColor,
				rank.borderColor,
				s.container,
				className,
			)}
		>
			<Icon className={cn(s.icon, rank.color)} />
			<span className={cn("font-semibold", s.text, rank.color)}>
				{rank.tier} {rank.division}
			</span>
			{showLp && (
				<span className={cn("text-muted-foreground", s.lpText)}>
					({rank.lp} LP)
				</span>
			)}
		</div>
	);
}
