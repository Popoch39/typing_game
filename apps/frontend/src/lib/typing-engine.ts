export type CharState =
	| "correct"
	| "incorrect"
	| "extra"
	| "missed"
	| "pending";

export interface WordState {
	word: string;
	chars: { char: string; state: CharState }[];
	typed: string;
	completed: boolean;
}

export interface EngineState {
	words: WordState[];
	currentWordIndex: number;
	currentCharIndex: number;
	timeRemaining: number;
	duration: number;
	mode: string;
	isRunning: boolean;
	isComplete: boolean;
	wpm: number;
	rawWpm: number;
	accuracy: number;
	wpmHistory: { time: number; wpm: number }[];
	correctChars: number;
	incorrectChars: number;
	totalCharsTyped: number;
}

export interface EngineCallbacks {
	onStateChange: () => void;
	onTick: () => void;
	onComplete: () => void;
}

export class TypingEngine {
	private words: WordState[];
	private currentWordIndex = 0;
	private currentCharIndex = 0;
	private duration: number;
	private timeRemaining: number;
	private mode: string;
	private isRunning = false;
	private isComplete = false;
	private correctChars = 0;
	private incorrectChars = 0;
	private totalCharsTyped = 0;
	private startTime = 0;
	private timer: ReturnType<typeof setInterval> | null = null;
	private callbacks: EngineCallbacks;
	private wpmHistory: { time: number; wpm: number }[] = [];

	constructor(
		wordStrings: string[],
		duration: number,
		mode: string,
		callbacks: EngineCallbacks,
	) {
		this.words = wordStrings.map(this.createWordState);
		this.duration = duration;
		this.timeRemaining = duration;
		this.mode = mode;
		this.callbacks = callbacks;
	}

	private createWordState(word: string): WordState {
		return {
			word,
			chars: word.split("").map((char) => ({ char, state: "pending" })),
			typed: "",
			completed: false,
		};
	}

	private startTimer() {
		if (this.isRunning) return;
		this.isRunning = true;
		this.startTime = Date.now();
		this.timer = setInterval(() => {
			const elapsed = (Date.now() - this.startTime) / 1000;
			this.timeRemaining = Math.max(0, this.duration - elapsed);

			// Record WPM every second
			const elapsedMinutes = elapsed / 60;
			if (elapsedMinutes > 0) {
				this.wpmHistory.push({
					time: Math.floor(elapsed),
					wpm: Math.round(this.correctChars / 5 / elapsedMinutes),
				});
			}

			this.callbacks.onTick();

			if (this.timeRemaining <= 0) {
				this.complete();
			}
		}, 200);
	}

	private complete() {
		this.isComplete = true;
		this.isRunning = false;
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		// Mark remaining chars in current word as missed
		const currentWord = this.words[this.currentWordIndex];
		if (currentWord && !currentWord.completed) {
			for (let i = this.currentCharIndex; i < currentWord.chars.length; i++) {
				currentWord.chars[i].state = "missed";
			}
		}
		this.callbacks.onComplete();
	}

	handleChar(char: string): void {
		if (this.isComplete) return;
		if (!this.isRunning) this.startTimer();

		const word = this.words[this.currentWordIndex];
		if (!word) return;

		this.totalCharsTyped++;

		if (this.currentCharIndex < word.word.length) {
			// Typing within word length
			if (char === word.word[this.currentCharIndex]) {
				word.chars[this.currentCharIndex].state = "correct";
				this.correctChars++;
			} else {
				word.chars[this.currentCharIndex].state = "incorrect";
				this.incorrectChars++;
			}
			this.currentCharIndex++;
		} else {
			// Extra chars beyond word length
			word.chars.push({ char, state: "extra" });
			this.currentCharIndex++;
			this.incorrectChars++;
		}

		word.typed = word.typed + char;
		this.callbacks.onStateChange();
	}

	handleSpace(): void {
		if (this.isComplete) return;
		if (!this.isRunning) this.startTimer();

		const word = this.words[this.currentWordIndex];
		if (!word) return;

		// Mark remaining chars as missed and count them as incorrect
		const missedCount = word.word.length - this.currentCharIndex;
		for (let i = this.currentCharIndex; i < word.word.length; i++) {
			word.chars[i].state = "missed";
		}
		this.incorrectChars += missedCount;

		word.completed = true;
		this.totalCharsTyped++; // count space

		this.currentWordIndex++;
		this.currentCharIndex = 0;

		// If we've gone through all words, complete
		if (this.currentWordIndex >= this.words.length) {
			this.complete();
			return;
		}

		this.callbacks.onStateChange();
	}

	handleBackspace(): void {
		if (this.isComplete) return;

		const word = this.words[this.currentWordIndex];
		if (!word) return;

		if (this.currentCharIndex > 0) {
			this.currentCharIndex--;
			// If we're in the extra zone, remove the extra char
			if (this.currentCharIndex >= word.word.length) {
				word.chars.pop();
			} else {
				word.chars[this.currentCharIndex].state = "pending";
			}
			word.typed = word.typed.slice(0, -1);
		} else if (this.currentWordIndex > 0) {
			// Go back to previous word only if it has errors
			const prevWord = this.words[this.currentWordIndex - 1];
			const hasErrors = prevWord.chars.some(
				(c) =>
					c.state === "incorrect" ||
					c.state === "extra" ||
					c.state === "missed",
			);
			if (!hasErrors) return;

			this.currentWordIndex--;
			prevWord.completed = false;

			// Undo the space that was counted when moving to next word
			this.totalCharsTyped--;

			// Reset missed chars back to pending and undo their incorrect count
			for (const c of prevWord.chars) {
				if (c.state === "missed") {
					this.incorrectChars--;
					c.state = "pending";
				}
			}

			this.currentCharIndex = prevWord.typed.length;
		}

		this.callbacks.onStateChange();
	}

	handleCtrlBackspace(): void {
		if (this.isComplete) return;

		const word = this.words[this.currentWordIndex];
		if (!word) return;

		// Clear current word entirely
		// Remove extra chars
		word.chars = word.word
			.split("")
			.map((char) => ({ char, state: "pending" as CharState }));
		word.typed = "";
		this.currentCharIndex = 0;

		this.callbacks.onStateChange();
	}

	getState(): EngineState {
		const elapsed = this.startTime
			? (Date.now() - this.startTime) / 1000
			: 0;
		const elapsedMinutes = elapsed / 60;

		return {
			words: this.words,
			currentWordIndex: this.currentWordIndex,
			currentCharIndex: this.currentCharIndex,
			timeRemaining: Math.round(this.timeRemaining),
			duration: this.duration,
			mode: this.mode,
			isRunning: this.isRunning,
			isComplete: this.isComplete,
			wpm:
				elapsedMinutes > 0
					? Math.round(this.correctChars / 5 / elapsedMinutes)
					: 0,
			rawWpm:
				elapsedMinutes > 0
					? Math.round(this.totalCharsTyped / 5 / elapsedMinutes)
					: 0,
			accuracy:
				this.totalCharsTyped > 0
					? Math.round(
							(this.correctChars / (this.correctChars + this.incorrectChars)) *
								100,
						)
					: 100,
			wpmHistory: this.wpmHistory,
			correctChars: this.correctChars,
			incorrectChars: this.incorrectChars,
			totalCharsTyped: this.totalCharsTyped,
		};
	}

	reset(wordStrings?: string[]): void {
		this.destroy();
		if (wordStrings) {
			this.words = wordStrings.map(this.createWordState);
		} else {
			this.words = this.words.map((w) => this.createWordState(w.word));
		}
		this.currentWordIndex = 0;
		this.currentCharIndex = 0;
		this.timeRemaining = this.duration;
		this.isRunning = false;
		this.isComplete = false;
		this.correctChars = 0;
		this.incorrectChars = 0;
		this.totalCharsTyped = 0;
		this.startTime = 0;
		this.wpmHistory = [];
		this.callbacks.onStateChange();
	}

	destroy(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}
}
