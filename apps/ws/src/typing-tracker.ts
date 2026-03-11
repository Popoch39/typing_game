export interface TrackerStats {
	wpm: number;
	rawWpm: number;
	accuracy: number;
	wordIndex: number;
	charIndex: number;
	completed: boolean;
}

export class ServerTypingTracker {
	private words: string[];
	private currentWordIndex = 0;
	private currentCharIndex = 0;
	private correctChars = 0;
	private incorrectChars = 0;
	private totalCharsTyped = 0;
	private typedPerWord: string[];
	private startTime: number;
	private completed = false;

	constructor(words: string[], startTime: number) {
		this.words = words;
		this.startTime = startTime;
		this.typedPerWord = words.map(() => "");
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
			}
		} else {
			// Extra chars beyond word length
			this.incorrectChars++;
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

		this.totalCharsTyped++; // count space

		this.currentWordIndex++;
		this.currentCharIndex = 0;

		// If we've gone through all words, complete
		if (this.currentWordIndex >= this.words.length) {
			this.completed = true;
		}
	}

	handleBackspace(): void {
		if (this.completed) return;

		const word = this.words[this.currentWordIndex];
		if (word === undefined) return;

		if (this.currentCharIndex > 0) {
			this.currentCharIndex--;
			this.typedPerWord[this.currentWordIndex] =
				this.typedPerWord[this.currentWordIndex]!.slice(0, -1);
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
							(this.correctChars /
								(this.correctChars + this.incorrectChars)) *
								100,
						)
					: 100,
			wordIndex: this.currentWordIndex,
			charIndex: this.currentCharIndex,
			completed: this.completed,
		};
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
