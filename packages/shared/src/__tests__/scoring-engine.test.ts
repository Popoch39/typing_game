import { describe, it, expect, beforeEach } from "bun:test";
import { ScoringEngine } from "../scoring-engine";

describe("ScoringEngine", () => {
	let engine: ScoringEngine;

	beforeEach(() => {
		engine = new ScoringEngine();
	});

	describe("getBasePoints", () => {
		it("returns 10 for 1-3 char words", () => {
			expect(ScoringEngine.getBasePoints(1)).toBe(10);
			expect(ScoringEngine.getBasePoints(2)).toBe(10);
			expect(ScoringEngine.getBasePoints(3)).toBe(10);
		});

		it("returns 25 for 4-6 char words", () => {
			expect(ScoringEngine.getBasePoints(4)).toBe(25);
			expect(ScoringEngine.getBasePoints(5)).toBe(25);
			expect(ScoringEngine.getBasePoints(6)).toBe(25);
		});

		it("returns 50 for 7-9 char words", () => {
			expect(ScoringEngine.getBasePoints(7)).toBe(50);
			expect(ScoringEngine.getBasePoints(8)).toBe(50);
			expect(ScoringEngine.getBasePoints(9)).toBe(50);
		});

		it("returns 75 for 10+ char words", () => {
			expect(ScoringEngine.getBasePoints(10)).toBe(75);
			expect(ScoringEngine.getBasePoints(15)).toBe(75);
		});
	});

	describe("roundCombo", () => {
		it("rounds to nearest 0.25", () => {
			expect(ScoringEngine.roundCombo(2.5)).toBe(2.5);
			expect(ScoringEngine.roundCombo(1.5)).toBe(1.5);
			expect(ScoringEngine.roundCombo(1.3)).toBe(1.25);
			expect(ScoringEngine.roundCombo(1.1)).toBe(1.0);
			expect(ScoringEngine.roundCombo(0.875)).toBe(1.0);
		});
	});

	describe("scoreWord - combo mechanics", () => {
		it("starts at combo 1.0", () => {
			expect(engine.combo).toBe(1.0);
		});

		it("increases combo by 0.25 on perfect word", () => {
			engine.scoreWord(5, false);
			expect(engine.combo).toBe(1.25);
		});

		it("caps combo at 3.0", () => {
			for (let i = 0; i < 20; i++) {
				engine.scoreWord(5, false);
			}
			expect(engine.combo).toBe(3.0);
		});

		it("halves combo on error, rounded to 0.25, min 1.0", () => {
			// Build up combo to 3.0
			for (let i = 0; i < 8; i++) {
				engine.scoreWord(5, false);
			}
			expect(engine.combo).toBe(3.0);

			// Error: 3.0 / 2 = 1.5
			engine.scoreWord(5, true);
			expect(engine.combo).toBe(1.5);

			// Error: 1.5 / 2 = 0.75 → round to 0.75 → min 1.0
			engine.scoreWord(5, true);
			expect(engine.combo).toBe(1.0);

			// Error: still 1.0
			engine.scoreWord(5, true);
			expect(engine.combo).toBe(1.0);
		});

		it("2.0 / 2 = 1.0", () => {
			for (let i = 0; i < 4; i++) {
				engine.scoreWord(5, false);
			}
			expect(engine.combo).toBe(2.0);

			engine.scoreWord(5, true);
			expect(engine.combo).toBe(1.0);
		});

		it("1.75 / 2 = 0.875 → rounds to 1.0 (min)", () => {
			for (let i = 0; i < 3; i++) {
				engine.scoreWord(5, false);
			}
			expect(engine.combo).toBe(1.75);

			engine.scoreWord(5, true);
			expect(engine.combo).toBe(1.0);
		});
	});

	describe("scoreWord - full formula", () => {
		it("perfect word: base * 1.5 * combo", () => {
			const result = engine.scoreWord(5, false);
			expect(result.wordScore).toBe(Math.floor(25 * 1.5 * 1.0)); // 37
			expect(result.isPerfect).toBe(true);
			expect(engine.totalScore).toBe(37);
		});

		it("error word: base * 1.0 * combo", () => {
			const result = engine.scoreWord(5, true);
			expect(result.wordScore).toBe(Math.floor(25 * 1.0 * 1.0)); // 25
			expect(result.isPerfect).toBe(false);
		});

		it("accumulates totalScore", () => {
			engine.scoreWord(5, false); // 37
			engine.scoreWord(5, false); // floor(25 * 1.5 * 1.25) = floor(46.875) = 46
			expect(engine.totalScore).toBe(37 + 46);
		});

		it("tracks lastWordScore", () => {
			engine.scoreWord(5, false);
			expect(engine.lastWordScore).toBe(37);

			engine.scoreWord(3, true); // 10 * 1.0 * 1.25 = 12
			expect(engine.lastWordScore).toBe(12);
		});
	});

	describe("computeFinalScore", () => {
		it("returns totalScore + wpmBonus when no time remaining", () => {
			engine.scoreWord(5, false); // totalScore = 37
			// wpmBonus = floor(60 * 1 * 2) = 120
			const final = engine.computeFinalScore(60, 1, 0);
			expect(final).toBe(37 + 120);
		});

		it("wpmBonus scales with wordsCompleted", () => {
			engine.scoreWord(5, false); // totalScore = 37
			// wpmBonus = floor(50 * 5 * 2) = 500
			const final = engine.computeFinalScore(50, 5, 0);
			expect(final).toBe(37 + 500);
		});

		it("adds flat time bonus when remaining seconds > 0", () => {
			engine.scoreWord(5, false); // totalScore = 37
			// wpmBonus = floor(50 * 1 * 2) = 100, timeBonus = floor(10 * 10) = 100
			const final = engine.computeFinalScore(50, 1, 10);
			expect(final).toBe(37 + 100 + 100);
		});

		it("no time bonus when remaining seconds = 0", () => {
			engine.scoreWord(5, false); // totalScore = 37
			const final = engine.computeFinalScore(50, 1, 0);
			expect(final).toBe(37 + 100);
		});

		it("wpmBonus is 0 when wpm is 0", () => {
			engine.scoreWord(5, false); // totalScore = 37
			const final = engine.computeFinalScore(0, 5, 0);
			expect(final).toBe(37);
		});
	});

	describe("skipWord", () => {
		it("gives 0 points", () => {
			const result = engine.skipWord();
			expect(result.wordScore).toBe(0);
			expect(result.isPerfect).toBe(false);
			expect(engine.totalScore).toBe(0);
		});

		it("halves combo, rounded to 0.25, min 1.0", () => {
			// Build combo to 3.0
			for (let i = 0; i < 8; i++) {
				engine.scoreWord(5, false);
			}
			expect(engine.combo).toBe(3.0);

			const result = engine.skipWord();
			expect(result.combo).toBe(1.5);
			expect(engine.combo).toBe(1.5);
		});

		it("does not go below 1.0", () => {
			engine.skipWord();
			expect(engine.combo).toBe(1.0);

			engine.skipWord();
			expect(engine.combo).toBe(1.0);
		});

		it("sets lastWordScore to 0", () => {
			engine.scoreWord(5, false); // sets lastWordScore > 0
			expect(engine.lastWordScore).toBeGreaterThan(0);

			engine.skipWord();
			expect(engine.lastWordScore).toBe(0);
		});

		it("does not add to totalScore", () => {
			engine.scoreWord(5, false);
			const scoreBefore = engine.totalScore;

			engine.skipWord();
			expect(engine.totalScore).toBe(scoreBefore);
		});
	});

	describe("reset", () => {
		it("resets all state", () => {
			engine.scoreWord(5, false);
			engine.scoreWord(5, false);
			engine.reset();
			expect(engine.combo).toBe(1.0);
			expect(engine.totalScore).toBe(0);
			expect(engine.lastWordScore).toBe(0);
		});
	});
});
