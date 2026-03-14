"use client";

import { useRef } from "react";
import { useTypingStore } from "@/stores/use-typing-store";
import { useComboAnimations } from "./animations/use-combo-animations";

type Rank = {
	label: string;
	color: string;
} | null;

function getRank(combo: number): Rank {
	if (combo >= 3.0) return { label: "PERFECT", color: "#ef4444" };
	if (combo >= 2.75) return { label: "EXCELLENT", color: "#f97316" };
	if (combo >= 2.25) return { label: "GREAT", color: "#eab308" };
	if (combo >= 1.75) return { label: "NICE", color: "#84cc16" };
	return null;
}

export function ComboDisplay() {
	const combo = useTypingStore((s) => s.combo);
	const isRunning = useTypingStore((s) => s.isRunning);
	const currentWordIndex = useTypingStore((s) => s.currentWordIndex);

	const containerRef = useRef<HTMLDivElement>(null);
	const multiplierRef = useRef<HTMLDivElement>(null);
	const rankRef = useRef<HTMLDivElement>(null);
	const streakRef = useRef<HTMLSpanElement>(null);
	const progressRef = useRef<HTMLDivElement>(null);
	const slashRefs = useRef<(HTMLDivElement | null)[]>([]);

	const { perfectStreak } = useComboAnimations(
		{
			container: containerRef,
			multiplier: multiplierRef,
			rank: rankRef,
			streak: streakRef,
			progress: progressRef,
			slashes: slashRefs,
		},
		combo,
		isRunning,
		currentWordIndex,
	);

	if (!isRunning) return null;

	const rank = getRank(combo);
	const progress = Math.min(((combo - 1) / 2) * 100, 100);
	const streak = perfectStreak.current;

	return (
		<div
			ref={containerRef}
			className="pointer-events-none absolute right-4 top-[-2.5rem] z-30 flex flex-col items-end gap-0.5"
		>
			{/* Slash lines */}
			<div className="absolute inset-0 overflow-hidden">
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						ref={(el) => {
							slashRefs.current[i] = el;
						}}
						className="absolute opacity-0"
						style={{
							width: "3px",
							height: "120%",
							background:
								"linear-gradient(180deg, transparent, #ffd700, transparent)",
							top: "-10%",
							left: `${40 + i * 12}%`,
							transform: "rotate(-15deg)",
						}}
					/>
				))}
			</div>

			{/* Multiplier */}
			<div
				ref={multiplierRef}
				className="relative font-[family-name:var(--font-bebas)] text-5xl leading-none"
				style={{
					color: "#ffd700",
					textShadow: "0 0 10px rgba(255, 215, 0, 0.3)",
					transform: "skewX(-8deg)",
				}}
			>
				{combo.toFixed(1)}x
			</div>

			{/* Rank + streak counter */}
			{rank && (
				<div
					ref={rankRef}
					className="font-[family-name:var(--font-bebas)] text-2xl leading-none tracking-wider"
					style={{ color: rank.color }}
				>
					{rank.label}
					{streak > 0 && (
						<span
							ref={streakRef}
							className="ml-1 inline-block font-[family-name:var(--font-bebas)] text-lg"
							style={{ color: "#ffd700" }}
						>
							x{streak}
						</span>
					)}
				</div>
			)}

			{/* Progress bar */}
			<div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-white/10">
				<div
					ref={progressRef}
					className="h-full rounded-full"
					style={{
						width: `${progress}%`,
						background: "linear-gradient(90deg, #ffd700, #ffaa00)",
					}}
				/>
			</div>
		</div>
	);
}
