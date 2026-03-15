"use client";

import { cn } from "@/lib/utils";
import { RatingChangeBadge } from "./rating-change-badge";

interface PlayerResultCardProps {
	label: string;
	name?: string;
	score: number;
	wordPoints?: number;
	wpmBonus?: number;
	timeBonus?: number;
	wpm: number;
	rawWpm: number;
	accuracy: number;
	isHighlighted: boolean;
	ratingChange?: {
		change: number;
		oldRating?: number;
		newRating?: number;
	} | null;
	isRanked: boolean;
}

export function PlayerResultCard({
	label,
	name,
	score,
	wordPoints,
	wpmBonus,
	timeBonus,
	wpm,
	rawWpm,
	accuracy,
	isHighlighted,
	ratingChange,
	isRanked,
}: PlayerResultCardProps) {
	return (
		<div
			className={cn(
				"space-y-2 rounded-lg p-3 text-center",
				isHighlighted && "ring-2 ring-primary",
			)}
		>
			<p className="text-sm font-medium">{name ?? label}</p>
			<p className="font-mono text-3xl font-bold text-primary">{score}</p>
			<p className="text-xs text-muted-foreground">score</p>
			<div className="space-y-0.5 text-xs text-muted-foreground">
				<p>Mots : {wordPoints ?? 0}</p>
				<p>WPM : {wpmBonus ?? 0}</p>
				{(timeBonus ?? 0) > 0 && <p>Temps : {timeBonus}</p>}
			</div>
			{isRanked && ratingChange && (
				<RatingChangeBadge
					change={ratingChange.change}
					oldRating={ratingChange.oldRating}
					newRating={ratingChange.newRating}
				/>
			)}
			<div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
				<div>
					<p className="font-mono font-semibold text-foreground">{wpm}</p>
					<p>wpm</p>
				</div>
				<div>
					<p className="font-mono font-semibold text-foreground">{rawWpm}</p>
					<p>raw</p>
				</div>
				<div>
					<p className="font-mono font-semibold text-foreground">{accuracy}%</p>
					<p>acc</p>
				</div>
			</div>
		</div>
	);
}
