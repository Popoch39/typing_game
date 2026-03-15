"use client";

import { getRankFromRating, getTierColor } from "@repo/shared";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function RatingChangeBadge({
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
