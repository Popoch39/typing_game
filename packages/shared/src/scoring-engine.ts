export interface FinalScoreBreakdown {
	wordPoints: number;
	wpmBonus: number;
	timeBonus: number;
	total: number;
}

export interface WordScoreResult {
	wordScore: number;
	combo: number;
	isPerfect: boolean;
}

export class ScoringEngine {
	combo = 1.0;
	totalScore = 0;
	lastWordScore = 0;

	static getBasePoints(wordLength: number): number {
		if (wordLength <= 3) return 10;
		if (wordLength <= 6) return 25;
		if (wordLength <= 9) return 50;
		return 75;
	}

	static roundCombo(value: number): number {
		return Math.round(value * 4) / 4;
	}

	scoreWord(wordLength: number, hadError: boolean): WordScoreResult {
		const basePoints = ScoringEngine.getBasePoints(wordLength);
		const isPerfect = !hadError;
		const accuracyBonus = isPerfect ? 1.5 : 1.0;

		const wordScore = Math.floor(basePoints * accuracyBonus * this.combo);
		this.totalScore += wordScore;
		this.lastWordScore = wordScore;

		// Update combo
		if (isPerfect) {
			this.combo = Math.min(3.0, this.combo + 0.25);
		} else {
			this.combo = Math.max(1.0, ScoringEngine.roundCombo(this.combo / 2));
		}

		return { wordScore, combo: this.combo, isPerfect };
	}

	computeFinalScore(wpm: number, wordsCompleted: number, remainingSeconds: number): FinalScoreBreakdown {
		const wordPoints = this.totalScore;
		const wpmBonus = Math.floor(wpm * wordsCompleted * 2);
		const timeBonus = remainingSeconds > 0 ? Math.floor(remainingSeconds * 10) : 0;
		return { wordPoints, wpmBonus, timeBonus, total: wordPoints + wpmBonus + timeBonus };
	}

	skipWord(): WordScoreResult {
		this.combo = Math.max(1.0, ScoringEngine.roundCombo(this.combo / 2));
		this.lastWordScore = 0;
		return { wordScore: 0, combo: this.combo, isPerfect: false };
	}

	reset(): void {
		this.combo = 1.0;
		this.totalScore = 0;
		this.lastWordScore = 0;
	}
}
