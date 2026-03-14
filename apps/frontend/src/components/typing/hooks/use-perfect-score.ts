import { ScoringEngine } from "@repo/shared/scoring-engine";
import { useMemo } from "react";
import type { WordState } from "@/lib/typing-engine";

const MAX_COMBO = 3.0;

export function usePerfectScore(words: WordState[], currentWordIndex: number) {
	return useMemo(() => {
		let simCombo = 1.0;
		let total = 0;
		for (let i = 0; i < currentWordIndex; i++) {
			const word = words[i];
			if (!word) break;
			const base = ScoringEngine.getBasePoints(word.word.length);
			total += Math.floor(base * 1.5 * simCombo);
			simCombo = Math.min(MAX_COMBO, simCombo + 0.25);
		}
		return total;
	}, [words, currentWordIndex]);
}
