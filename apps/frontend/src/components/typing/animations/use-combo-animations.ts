import gsap from "gsap";
import { useEffect, useRef } from "react";

const MAX_COMBO = 3.0;

export type ComboAnimationRefs = {
	container: React.RefObject<HTMLDivElement | null>;
	multiplier: React.RefObject<HTMLDivElement | null>;
	rank: React.RefObject<HTMLDivElement | null>;
	streak: React.RefObject<HTMLSpanElement | null>;
	progress: React.RefObject<HTMLDivElement | null>;
	slashes: React.RefObject<(HTMLDivElement | null)[]>;
};

export function useComboAnimations(
	refs: ComboAnimationRefs,
	combo: number,
	isRunning: boolean,
	currentWordIndex: number,
) {
	const prevComboRef = useRef(1.0);
	const prevWordIndexRef = useRef(0);
	const perfectStreakRef = useRef(0);
	const prevRankLabelRef = useRef<string | null>(null);
	const glowTweenRef = useRef<gsap.core.Tween | null>(null);
	const gsapCtxRef = useRef<gsap.Context | null>(null);

	// GSAP context scoped to container — revert() kills all tweens on unmount
	useEffect(() => {
		if (refs.container.current) {
			gsapCtxRef.current = gsap.context(() => {}, refs.container.current);
		}
		return () => {
			gsapCtxRef.current?.revert();
			gsapCtxRef.current = null;
			glowTweenRef.current = null;
		};
	}, [refs.container]);

	useEffect(() => {
		const ctx = gsapCtxRef.current;
		if (!ctx) return;

		if (!isRunning) {
			prevComboRef.current = 1.0;
			prevWordIndexRef.current = 0;
			perfectStreakRef.current = 0;
			prevRankLabelRef.current = null;
			if (glowTweenRef.current) {
				glowTweenRef.current.kill();
				glowTweenRef.current = null;
			}
			return;
		}

		const prevCombo = prevComboRef.current;
		const prevWordIndex = prevWordIndexRef.current;
		const prevRankLabel = prevRankLabelRef.current;
		const wordCompleted = currentWordIndex > prevWordIndex;
		const rankLabel = getRankLabel(combo);

		// Track perfect streak
		if (wordCompleted && combo >= MAX_COMBO) {
			perfectStreakRef.current += 1;
		} else if (combo < MAX_COMBO) {
			perfectStreakRef.current = 0;
		}
		const streak = perfectStreakRef.current;

		ctx.add(() => {
			animateProgress(refs.progress.current, combo);
			animateComboChange(refs.multiplier.current, combo, prevCombo);
			animateStreakPunch(
				refs.streak.current,
				refs.multiplier.current,
				combo,
				wordCompleted,
				streak,
			);
			animateRankChange(
				refs.slashes.current,
				refs.rank.current,
				rankLabel,
				prevRankLabel,
			);
		});

		// Glow — managed outside ctx.add because it's a persistent tween
		if (combo >= MAX_COMBO && refs.multiplier.current) {
			const glowSize = Math.min(20 + streak * 4, 60);
			const glowSize2 = Math.min(40 + streak * 8, 120);
			const glowOpacity = Math.min(0.8 + streak * 0.02, 1);
			const glowOpacity2 = Math.min(0.4 + streak * 0.04, 0.8);
			const glowSpeed = Math.max(0.6 - streak * 0.03, 0.3);

			if (glowTweenRef.current) {
				glowTweenRef.current.kill();
			}
			glowTweenRef.current = gsap.to(refs.multiplier.current, {
				textShadow: `0 0 ${glowSize}px rgba(255, 215, 0, ${glowOpacity}), 0 0 ${glowSize2}px rgba(255, 215, 0, ${glowOpacity2})`,
				duration: glowSpeed,
				yoyo: true,
				repeat: -1,
				ease: "sine.inOut",
			});
		} else if (combo < MAX_COMBO && glowTweenRef.current) {
			glowTweenRef.current.kill();
			glowTweenRef.current = null;
			if (refs.multiplier.current) {
				gsap.set(refs.multiplier.current, { textShadow: "none" });
			}
		}

		prevComboRef.current = combo;
		prevWordIndexRef.current = currentWordIndex;
		prevRankLabelRef.current = rankLabel;
	}, [combo, isRunning, currentWordIndex, refs]);

	return { perfectStreak: perfectStreakRef };
}

// --- Pure animation functions ---

function getRankLabel(combo: number): string | null {
	if (combo >= 3.0) return "PERFECT";
	if (combo >= 2.75) return "EXCELLENT";
	if (combo >= 2.25) return "GREAT";
	if (combo >= 1.75) return "NICE";
	return null;
}

function animateProgress(el: HTMLDivElement | null, combo: number) {
	if (!el) return;
	const progress = Math.min(((combo - 1) / 2) * 100, 100);
	gsap.to(el, { width: `${progress}%`, duration: 0.3, ease: "power2.out" });
}

function animateComboChange(
	el: HTMLDivElement | null,
	combo: number,
	prevCombo: number,
) {
	if (!el) return;
	if (combo > prevCombo) {
		gsap.fromTo(
			el,
			{ scale: 1.4 },
			{ scale: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" },
		);
	} else if (combo < prevCombo) {
		gsap.fromTo(
			el,
			{ x: -3 },
			{ x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" },
		);
	}
}

function animateStreakPunch(
	streakEl: HTMLSpanElement | null,
	multiplierEl: HTMLDivElement | null,
	combo: number,
	wordCompleted: boolean,
	streak: number,
) {
	if (!wordCompleted || combo < MAX_COMBO || streak <= 0) return;
	if (streakEl) {
		gsap.fromTo(
			streakEl,
			{ scale: 1.6, opacity: 0.5 },
			{ scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" },
		);
	}
	if (multiplierEl) {
		gsap.fromTo(
			multiplierEl,
			{ scale: 1.15 },
			{ scale: 1, duration: 0.25, ease: "power2.out" },
		);
	}
}

function animateRankChange(
	slashes: (HTMLDivElement | null)[],
	rankEl: HTMLDivElement | null,
	rankLabel: string | null,
	prevRankLabel: string | null,
) {
	if (!rankLabel || rankLabel === prevRankLabel) return;

	const validSlashes = slashes.filter(Boolean);
	if (validSlashes.length > 0) {
		gsap.fromTo(
			validSlashes,
			{ x: -60, opacity: 0 },
			{
				x: 60,
				opacity: 1,
				duration: 0.4,
				stagger: 0.05,
				ease: "power3.out",
				onComplete: () => {
					gsap.to(validSlashes, { opacity: 0, duration: 0.2 });
				},
			},
		);
	}

	if (rankEl) {
		gsap.fromTo(
			rankEl,
			{ scale: 0.5, opacity: 0 },
			{ scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" },
		);
	}

	gsap.fromTo(
		document.body,
		{ boxShadow: "inset 0 0 100px rgba(255, 215, 0, 0.3)" },
		{
			boxShadow: "inset 0 0 100px rgba(255, 215, 0, 0)",
			duration: 0.4,
			ease: "power2.out",
		},
	);
}
