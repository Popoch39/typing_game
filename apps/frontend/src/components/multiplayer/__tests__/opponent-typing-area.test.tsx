import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OpponentTypingArea } from "../opponent-typing-area";

describe("OpponentTypingArea", () => {
	const words = ["hello", "world", "test"];

	it("returns null when words is empty", () => {
		const { container } = render(
			<OpponentTypingArea words={[]} wordIndex={0} charIndex={0} />,
		);
		expect(container.innerHTML).toBe("");
	});

	it("marks all chars in completed words as opponent-typed", () => {
		const { container } = render(
			<OpponentTypingArea words={words} wordIndex={1} charIndex={0} />,
		);

		// First word "hello" — all chars should be opponent-typed
		const firstWordChars = container.querySelectorAll("[data-ow='0'] > span");
		for (const char of firstWordChars) {
			expect(char).toHaveAttribute("data-state", "opponent-typed");
		}
	});

	it("marks typed chars in current word as opponent-typed and rest as pending", () => {
		const { container } = render(
			<OpponentTypingArea words={words} wordIndex={1} charIndex={3} />,
		);

		// Second word "world" — first 3 chars typed, last 2 pending
		const currentWordChars = container.querySelectorAll("[data-ow='1'] > span");
		const states = Array.from(currentWordChars).map((el) =>
			el.getAttribute("data-state"),
		);
		expect(states).toEqual([
			"opponent-typed",
			"opponent-typed",
			"opponent-typed",
			"pending",
			"pending",
		]);
	});

	it("marks all chars in future words as pending", () => {
		const { container } = render(
			<OpponentTypingArea words={words} wordIndex={0} charIndex={2} />,
		);

		// Third word "test" — all pending
		const futureWordChars = container.querySelectorAll("[data-ow='2'] > span");
		for (const char of futureWordChars) {
			expect(char).toHaveAttribute("data-state", "pending");
		}
	});
});
