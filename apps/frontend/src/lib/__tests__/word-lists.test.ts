import { describe, it, expect } from "vitest";
import { generateWordList } from "../word-lists";

describe("generateWordList", () => {
	it("returns the requested number of words", () => {
		const words = generateWordList("words", 10);
		expect(words).toHaveLength(10);
	});

	it("returns 0 words when count is 0", () => {
		const words = generateWordList("words", 0);
		expect(words).toHaveLength(0);
	});

	it("returns only strings", () => {
		const words = generateWordList("words", 50);
		for (const word of words) {
			expect(typeof word).toBe("string");
			expect(word.length).toBeGreaterThan(0);
		}
	});

	it("returns different results on subsequent calls (randomized)", () => {
		const a = generateWordList("words", 50);
		const b = generateWordList("words", 50);
		// Extremely unlikely to be identical
		expect(a.join(" ")).not.toBe(b.join(" "));
	});

	it("returns large word lists", () => {
		const words = generateWordList("words", 200);
		expect(words).toHaveLength(200);
	});
});
