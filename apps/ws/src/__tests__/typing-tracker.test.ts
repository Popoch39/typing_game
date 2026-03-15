import { describe, expect, it } from "bun:test";
import { ServerTypingTracker } from "../typing-tracker";

const START = 1000;

function createTracker(words: string[]) {
	return new ServerTypingTracker(words, START);
}

/** Type a full word char by char */
function typeWord(tracker: ServerTypingTracker, word: string) {
	for (const ch of word) tracker.handleChar(ch);
}

describe("ServerTypingTracker", () => {
	describe("handleChar", () => {
		it("increments correctChars for correct char", () => {
			const t = createTracker(["abc"]);
			t.handleChar("a");
			const stats = t.getStats(START + 60_000); // 1 min
			// 1 correct char / 5 / 1 min = 0.2 → rounds to 0
			expect(stats.accuracy).toBe(100);
			expect(stats.charIndex).toBe(1);
		});

		it("increments incorrectChars for wrong char", () => {
			const t = createTracker(["abc"]);
			t.handleChar("x");
			const stats = t.getStats(START + 60_000);
			expect(stats.accuracy).toBe(0);
			expect(stats.charIndex).toBe(1);
		});

		it("counts extra chars beyond word length as incorrect", () => {
			const t = createTracker(["ab"]);
			t.handleChar("a");
			t.handleChar("b");
			t.handleChar("z"); // extra
			const stats = t.getStats(START + 60_000);
			// 2 correct, 1 incorrect → accuracy = round(2/3 * 100) = 67
			expect(stats.accuracy).toBe(67);
			expect(stats.charIndex).toBe(3);
		});

		it("is no-op when completed", () => {
			const t = createTracker(["a"]);
			t.handleChar("a");
			t.handleSpace(); // completes
			const before = t.getStats(START + 60_000);
			t.handleChar("x");
			const after = t.getStats(START + 60_000);
			expect(before).toEqual(after);
		});

		it("is no-op when word is undefined (past last word)", () => {
			const t = createTracker(["a"]);
			t.handleChar("a");
			t.handleSpace(); // completes (currentWordIndex goes to 1 which is past length)
			expect(t.getStats(START).completed).toBe(true);
		});
	});

	describe("handleSpace", () => {
		it("advances to next word", () => {
			const t = createTracker(["ab", "cd"]);
			typeWord(t, "ab");
			t.handleSpace();
			const stats = t.getStats(START + 60_000);
			expect(stats.wordIndex).toBe(1);
			expect(stats.charIndex).toBe(0);
		});

		it("counts missed chars as incorrect", () => {
			const t = createTracker(["abc", "d"]);
			t.handleChar("a"); // 1 correct
			t.handleSpace(); // 2 missed → incorrect
			// 1 correct, 2 incorrect → accuracy = round(1/3 * 100) = 33
			const stats = t.getStats(START + 60_000);
			expect(stats.accuracy).toBe(33);
		});

		it("completes when all words are done", () => {
			const t = createTracker(["ab", "cd"]);
			typeWord(t, "ab");
			t.handleSpace();
			typeWord(t, "cd");
			t.handleSpace();
			expect(t.getStats(START).completed).toBe(true);
		});

		it("skipping a word (space with 0 chars typed) gives 0 points", () => {
			const t = createTracker(["abc", "de"]);
			t.handleSpace(); // skip "abc" entirely
			const stats = t.getStats(START + 60_000);
			expect(stats.score).toBe(0);
			expect(stats.wordIndex).toBe(1);
			// All chars of skipped word counted as incorrect
			expect(stats.accuracy).toBe(0);
		});

		it("spamming space through all words gives 0 total score", () => {
			const t = createTracker(["abc", "de", "fgh"]);
			t.handleSpace(); // skip "abc"
			t.handleSpace(); // skip "de"
			t.handleSpace(); // skip "fgh"
			const stats = t.getStats(START + 60_000);
			expect(stats.score).toBe(0);
			expect(stats.completed).toBe(true);
		});

		it("is no-op when completed", () => {
			const t = createTracker(["a"]);
			t.handleChar("a");
			t.handleSpace();
			const before = t.getStats(START + 60_000);
			t.handleSpace();
			const after = t.getStats(START + 60_000);
			expect(before).toEqual(after);
		});
	});

	describe("handleBackspace", () => {
		it("decrements charIndex within a word", () => {
			const t = createTracker(["abc"]);
			t.handleChar("a");
			t.handleChar("b");
			t.handleBackspace();
			expect(t.getStats(START).charIndex).toBe(1);
		});

		it("goes back to previous word if it has errors", () => {
			const t = createTracker(["ab", "cd"]);
			t.handleChar("a"); // correct
			t.handleChar("x"); // wrong → word has errors
			t.handleSpace();
			expect(t.getStats(START).wordIndex).toBe(1);
			t.handleBackspace(); // go back
			expect(t.getStats(START).wordIndex).toBe(0);
			expect(t.getStats(START).charIndex).toBe(2); // "ax".length
		});

		it("does NOT go back if previous word was correct", () => {
			const t = createTracker(["ab", "cd"]);
			typeWord(t, "ab");
			t.handleSpace();
			expect(t.getStats(START).wordIndex).toBe(1);
			t.handleBackspace(); // should not go back
			expect(t.getStats(START).wordIndex).toBe(1);
			expect(t.getStats(START).charIndex).toBe(0);
		});

		it("goes back if previous word was skipped (missed chars)", () => {
			const t = createTracker(["abc", "de"]);
			t.handleChar("a"); // typed 1 of 3
			t.handleSpace(); // skipped 2 chars
			expect(t.getStats(START).wordIndex).toBe(1);
			t.handleBackspace(); // go back (word has missed chars)
			expect(t.getStats(START).wordIndex).toBe(0);
		});

		it("undoes missed char count when going back", () => {
			const t = createTracker(["abc", "de"]);
			t.handleChar("a"); // 1 correct
			t.handleSpace(); // 2 missed → incorrect
			// Before backspace: 1 correct, 2 incorrect
			const before = t.getStats(START + 60_000);
			expect(before.accuracy).toBe(33); // 1/(1+2)
			t.handleBackspace(); // undo missed
			// After: 1 correct, 0 incorrect
			const after = t.getStats(START + 60_000);
			expect(after.accuracy).toBe(100);
		});

		it("does nothing at position 0 of first word", () => {
			const t = createTracker(["ab"]);
			t.handleBackspace();
			expect(t.getStats(START).charIndex).toBe(0);
			expect(t.getStats(START).wordIndex).toBe(0);
		});

		it("is no-op when completed", () => {
			const t = createTracker(["a"]);
			t.handleChar("a");
			t.handleSpace();
			const before = t.getStats(START + 60_000);
			t.handleBackspace();
			const after = t.getStats(START + 60_000);
			expect(before).toEqual(after);
		});
	});

	describe("handleCtrlBackspace", () => {
		it("resets charIndex and typed text for current word", () => {
			const t = createTracker(["abc"]);
			t.handleChar("a");
			t.handleChar("x");
			t.handleCtrlBackspace();
			expect(t.getStats(START).charIndex).toBe(0);
		});

		it("does not touch counters", () => {
			const t = createTracker(["abc"]);
			t.handleChar("a"); // correct
			t.handleChar("x"); // incorrect
			const before = t.getStats(START + 60_000);
			t.handleCtrlBackspace();
			const after = t.getStats(START + 60_000);
			// Counters (wpm, accuracy) stay the same
			expect(after.accuracy).toBe(before.accuracy);
			expect(after.wpm).toBe(before.wpm);
		});

		it("is no-op when completed", () => {
			const t = createTracker(["a"]);
			t.handleChar("a");
			t.handleSpace();
			const before = t.getStats(START + 60_000);
			t.handleCtrlBackspace();
			const after = t.getStats(START + 60_000);
			expect(before).toEqual(after);
		});
	});

	describe("getStats", () => {
		it("returns wpm = correctChars/5/minutes", () => {
			const t = createTracker(["hello"]); // 5 chars
			typeWord(t, "hello"); // 5 correct
			// At 1 minute: 5/5/1 = 1
			expect(t.getStats(START + 60_000).wpm).toBe(1);
		});

		it("returns rawWpm = totalCharsTyped/5/minutes", () => {
			const t = createTracker(["hi"]);
			t.handleChar("h"); // correct
			t.handleChar("x"); // incorrect
			// totalCharsTyped = 2, at 1 min: 2/5/1 = 0.4 → 0
			expect(t.getStats(START + 60_000).rawWpm).toBe(0);
			// At 6 seconds: 2/5/(6/60) = 2/5/0.1 = 4
			expect(t.getStats(START + 6_000).rawWpm).toBe(4);
		});

		it("returns accuracy = 100 when nothing typed", () => {
			const t = createTracker(["abc"]);
			expect(t.getStats(START).accuracy).toBe(100);
		});

		it("returns 0 wpm/rawWpm when no time elapsed", () => {
			const t = createTracker(["abc"]);
			t.handleChar("a");
			const stats = t.getStats(START); // 0 elapsed
			expect(stats.wpm).toBe(0);
			expect(stats.rawWpm).toBe(0);
		});

		it("returns errors = cumulative incorrectChars", () => {
			const t = createTracker(["abc", "de"]);
			t.handleChar("x"); // 1 incorrect
			t.handleChar("b");
			t.handleChar("c");
			expect(t.getStats(START).errors).toBe(1);
			t.handleSpace();
			t.handleChar("x"); // 2 incorrect total
			expect(t.getStats(START).errors).toBe(2);
		});

		it("returns errors = 0 when all correct", () => {
			const t = createTracker(["abc"]);
			typeWord(t, "abc");
			expect(t.getStats(START).errors).toBe(0);
		});
	});

	describe("hadError tracking", () => {
		it("no error on perfect word", () => {
			const t = createTracker(["abc", "de"]);
			typeWord(t, "abc");
			t.handleSpace();
			const stats = t.getStats(START + 60_000);
			// Perfect word should give accuracy bonus (1.5x)
			// base=10 (3 chars) * 1.5 * 1.0 combo = 15
			expect(stats.score).toBe(15);
		});

		it("hadError on incorrect char", () => {
			const t = createTracker(["abc"]);
			t.handleChar("x"); // wrong → hadError
			t.handleChar("b");
			t.handleChar("c");
			t.handleSpace();
			const stats = t.getStats(START + 60_000);
			// Error word: base=10 * 1.0 * 1.0 = 10
			expect(stats.score).toBe(10);
		});

		it("hadError on backspace", () => {
			const t = createTracker(["ab"]);
			t.handleChar("a");
			t.handleBackspace(); // hadError set
			t.handleChar("a");
			t.handleChar("b");
			t.handleSpace();
			const stats = t.getStats(START + 60_000);
			// Error word: base=10 * 1.0 * 1.0 = 10
			expect(stats.score).toBe(10);
		});

		it("ctrl+backspace resets hadError", () => {
			const t = createTracker(["abc"]);
			t.handleChar("x"); // wrong
			t.handleCtrlBackspace(); // resets hadError
			typeWord(t, "abc"); // correct
			t.handleSpace();
			const stats = t.getStats(START + 60_000);
			// Perfect after ctrl+backspace: base=10 * 1.5 * 1.0 = 15
			expect(stats.score).toBe(15);
		});

		it("hadError on missed chars (space early)", () => {
			const t = createTracker(["abc", "de"]);
			t.handleChar("a");
			t.handleSpace(); // 2 missed → hadError
			const stats = t.getStats(START + 60_000);
			// Error word: base=10 * 1.0 * 1.0 = 10
			expect(stats.score).toBe(10);
		});
	});

	describe("scoring", () => {
		it("combo increases on consecutive perfect words", () => {
			const t = createTracker(["ab", "cd", "ef"]);
			typeWord(t, "ab");
			t.handleSpace();
			expect(t.getStats(START).combo).toBe(1.25);

			typeWord(t, "cd");
			t.handleSpace();
			expect(t.getStats(START).combo).toBe(1.5);
		});

		it("combo halves on error word", () => {
			const t = createTracker(["ab", "cd", "ef", "gh"]);
			// Build combo
			typeWord(t, "ab");
			t.handleSpace(); // combo → 1.25
			typeWord(t, "cd");
			t.handleSpace(); // combo → 1.5

			// Error word
			t.handleChar("x");
			t.handleChar("f");
			t.handleSpace(); // combo → max(1.0, round(1.5/2)) = max(1.0, 0.75) = 1.0
			expect(t.getStats(START).combo).toBe(1.0);
		});

		it("tracks completedAt on completion", () => {
			const t = createTracker(["ab"]);
			expect(t.completedAt).toBeNull();
			typeWord(t, "ab");
			t.handleSpace();
			expect(t.completedAt).not.toBeNull();
			expect(typeof t.completedAt).toBe("number");
		});

		it("computeFinalScore returns breakdown", () => {
			const t = createTracker(["hello"]);
			typeWord(t, "hello");
			t.handleSpace();
			const stats = t.getStats(START + 60_000);
			// Perfect: base=25 * 1.5 * 1.0 = 37 total
			expect(stats.score).toBe(37);
			// Final with wpm=50, 1 word: 37 + floor(50*1*2) = 37 + 100 = 137
			const r1 = t.computeFinalScore(50, 1, 0);
			expect(r1.wordPoints).toBe(37);
			expect(r1.wpmBonus).toBe(100);
			expect(r1.timeBonus).toBe(0);
			expect(r1.total).toBe(137);
			// Final with wpm=100, 1 word: 37 + floor(100*1*2) = 37 + 200 = 237
			const r2 = t.computeFinalScore(100, 1, 0);
			expect(r2.total).toBe(237);
		});
	});

	describe("end-to-end", () => {
		it("typing a full text correctly produces expected stats", () => {
			const words = ["the", "cat"];
			const t = createTracker(words);

			// Type "the" + space + "cat" + space
			typeWord(t, "the"); // 3 correct
			t.handleSpace(); // totalCharsTyped + 1 = 4
			typeWord(t, "cat"); // 3 correct = 6 total correct
			t.handleSpace(); // totalCharsTyped + 1 = 8, completes

			const stats = t.getStats(START + 30_000); // 30s = 0.5min
			expect(stats.completed).toBe(true);
			// wpm = 6 / 5 / 0.5 = 2.4 → 2
			expect(stats.wpm).toBe(2);
			// rawWpm = 8 / 5 / 0.5 = 3.2 → 3
			expect(stats.rawWpm).toBe(3);
			expect(stats.accuracy).toBe(100);
		});

		it("typing with errors produces correct accuracy", () => {
			const words = ["ab"];
			const t = createTracker(words);

			t.handleChar("a"); // correct
			t.handleChar("x"); // wrong
			t.handleSpace(); // completes

			const stats = t.getStats(START + 60_000);
			expect(stats.completed).toBe(true);
			// 1 correct, 1 incorrect → 50%
			expect(stats.accuracy).toBe(50);
		});
	});
});
