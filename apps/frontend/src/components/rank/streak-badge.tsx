"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
	streak: number;
	className?: string;
}

export function StreakBadge({ streak, className }: StreakBadgeProps) {
	if (streak < 2) return null;

	const isHot = streak >= 5;
	const isOnFire = streak >= 10;

	return (
		<div
			className={cn(
				"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
				"border transition-all duration-200",
				isOnFire
					? "bg-red-500/10 border-red-500/30 text-red-500"
					: isHot
						? "bg-orange-500/10 border-orange-500/30 text-orange-500"
						: "bg-green-500/10 border-green-500/30 text-green-500",
				className,
			)}
		>
			<Flame className={cn("h-3.5 w-3.5", isOnFire && "animate-pulse")} />
			<span>{streak} Win Streak</span>
		</div>
	);
}
