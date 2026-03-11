import { describe, it, expect } from "bun:test";
import { generateWordList } from "../word-list";

describe("generateWordList", () => {
	it("returns the requested number of words", () => {
		expect(generateWordList(10)).toHaveLength(10);
		expect(generateWordList(1)).toHaveLength(1);
		expect(generateWordList(100)).toHaveLength(100);
	});

	it("returns an empty array for count 0", () => {
		expect(generateWordList(0)).toEqual([]);
	});

	it("returns only non-empty strings", () => {
		const words = generateWordList(50);
		for (const w of words) {
			expect(typeof w).toBe("string");
			expect(w.length).toBeGreaterThan(0);
		}
	});
});
