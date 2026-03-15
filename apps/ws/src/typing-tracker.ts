import {
	type FinalScoreBreakdown,
	ScoringEngine,
} from "@repo/shared/scoring-engine";

export interface TrackerStats {
	wpm: number;
	rawWpm: number;
	accuracy: number;
	wordIndex: number;
	charIndex: number;
	completed: boolean;
	score: number;
	combo: number;
	lastWordScore: number;
}

export class ServerTypingTracker {
	private words: string[];
	private currentWordIndex = 0;
	private currentCharIndex = 0;
	private correctChars = 0;
	private incorrectChars = 0;
	private totalCharsTyped = 0;
	private typedPerWord: string[];
	private hadErrorPerWord: boolean[];
	private startTime: number;
	private completed = false;
	private scoringEngine = new ScoringEngine();
	completedAt: number | null = null;

	constructor(words: string[], startTime: number) {
		this.words = words;
		this.startTime = startTime;
		this.typedPerWord = words.map(() => "");
		this.hadErrorPerWord = words.map(() => false);
	}

	handleChar(char: string): void {
		if (this.completed) return;

		const word = this.words[this.currentWordIndex];
		if (word === undefined) return;

		this.totalCharsTyped++;

		if (this.currentCharIndex < word.length) {
			if (char === word[this.currentCharIndex]) {
				this.correctChars++;
			} else {
				this.incorrectChars++;
				this.hadErrorPerWord[this.currentWordIndex] = true;
			}
		} else {
			// Extra chars beyond word length
			this.incorrectChars++;
			this.hadErrorPerWord[this.currentWordIndex] = true;
		}

		this.currentCharIndex++;
		this.typedPerWord[this.currentWordIndex] += char;
	}

	handleSpace(): void {
		if (this.completed) return;

		const word = this.words[this.currentWordIndex];
		if (word === undefined) return;

		// Mark remaining chars as missed (counted as incorrect)
		const missedCount = Math.max(0, word.length - this.currentCharIndex);
		this.incorrectChars += missedCount;
		if (missedCount > 0) {
			this.hadErrorPerWord[this.currentWordIndex] = true;
		}

		this.totalCharsTyped++; // count space

		const data = this.scoringEngine.scoreWord(
			word.length,
			this.hadErrorPerWord[this.currentWordIndex]!,
		);

		this.currentWordIndex++;
		this.currentCharIndex = 0;

		// If we've gone through all words, complete
		if (this.currentWordIndex >= this.words.length) {
			this.completed = true;
			this.completedAt = Date.now();
		}
	}

	handleBackspace(): void {
		if (this.completed) return;

		const word = this.words[this.currentWordIndex];
		if (word === undefined) return;

		if (this.currentCharIndex > 0) {
			this.currentCharIndex--;
			this.typedPerWord[this.currentWordIndex] = this.typedPerWord[
				this.currentWordIndex
			]!.slice(0, -1);
			this.hadErrorPerWord[this.currentWordIndex] = true;
		} else if (this.currentWordIndex > 0) {
			// Go back to previous word only if it has errors
			const prevWord = this.words[this.currentWordIndex - 1]!;
			const prevTyped = this.typedPerWord[this.currentWordIndex - 1]!;

			const hasErrors = this.wordHasErrors(prevWord, prevTyped);
			if (!hasErrors) return;

			this.currentWordIndex--;

			// Undo the space that was counted
			this.totalCharsTyped--;

			// Undo missed chars that were counted as incorrect
			const missedCount = Math.max(0, prevWord.length - prevTyped.length);
			this.incorrectChars -= missedCount;

			this.currentCharIndex = prevTyped.length;
		}
	}

	handleCtrlBackspace(): void {
		if (this.completed) return;

		// Reset current word's typed and charIndex, no counter changes
		this.typedPerWord[this.currentWordIndex] = "";
		this.hadErrorPerWord[this.currentWordIndex] = false;
		this.currentCharIndex = 0;
	}

	getStats(now: number): TrackerStats {
		const elapsed = (now - this.startTime) / 1000;
		const elapsedMinutes = elapsed / 60;

		return {
			wpm:
				elapsedMinutes > 0
					? Math.round(this.correctChars / 5 / elapsedMinutes)
					: 0,
			rawWpm:
				elapsedMinutes > 0
					? Math.round(this.totalCharsTyped / 5 / elapsedMinutes)
					: 0,
			accuracy:
				this.correctChars + this.incorrectChars > 0
					? Math.round(
							(this.correctChars / (this.correctChars + this.incorrectChars)) *
								100,
						)
					: 100,
			wordIndex: this.currentWordIndex,
			charIndex: this.currentCharIndex,
			completed: this.completed,
			score: this.scoringEngine.totalScore,
			combo: this.scoringEngine.combo,
			lastWordScore: this.scoringEngine.lastWordScore,
		};
	}

	computeFinalScore(
		wpm: number,
		wordsCompleted: number,
		remainingSeconds: number,
	): FinalScoreBreakdown {
		return this.scoringEngine.computeFinalScore(
			wpm,
			wordsCompleted,
			remainingSeconds,
		);
	}

	private wordHasErrors(word: string, typed: string): boolean {
		if (typed.length > word.length) return true; // has extra chars
		if (typed.length < word.length) return true; // has missed chars (was skipped)
		for (let i = 0; i < typed.length; i++) {
			if (typed[i] !== word[i]) return true;
		}
		return false;
	}
}
