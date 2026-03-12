import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTypingStore } from "../use-typing-store";

describe("useTypingStore", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Reset store state between tests
		useTypingStore.setState({
			engine: null,
			words: [],
			wordsVersion: 0,
			currentWordIndex: 0,
			currentCharIndex: 0,
			timeRemaining: 30,
			duration: 30,
			mode: "words",
			isRunning: false,
			isComplete: false,
			wpm: 0,
			rawWpm: 0,
			accuracy: 100,
			wpmHistory: [],
			correctChars: 0,
			incorrectChars: 0,
			totalCharsTyped: 0,
			opponent: null,
		});
	});

	afterEach(() => {
		const { engine } = useTypingStore.getState();
		if (engine) engine.destroy();
		vi.useRealTimers();
	});

	describe("init", () => {
		it("creates an engine and populates words", () => {
			useTypingStore.getState().init();
			const state = useTypingStore.getState();

			expect(state.engine).not.toBeNull();
			expect(state.words.length).toBeGreaterThan(0);
			expect(state.isRunning).toBe(false);
			expect(state.isComplete).toBe(false);
		});

		it("destroys previous engine on re-init", () => {
			useTypingStore.getState().init();
			const firstEngine = useTypingStore.getState().engine;
			const destroySpy = vi.spyOn(firstEngine!, "destroy");

			useTypingStore.getState().init();
			expect(destroySpy).toHaveBeenCalled();
		});

		it("uses current duration and mode", () => {
			useTypingStore.setState({ duration: 60, mode: "words" });
			useTypingStore.getState().init();

			const state = useTypingStore.getState();
			expect(state.duration).toBe(60);
			expect(state.timeRemaining).toBe(60);
		});
	});

	describe("reset", () => {
		it("resets the engine with new words", () => {
			useTypingStore.getState().init();
			const { engine } = useTypingStore.getState();

			// Type something
			engine!.handleChar("a");
			useTypingStore.getState().syncFromEngine();
			expect(useTypingStore.getState().totalCharsTyped).toBe(1);

			useTypingStore.getState().reset();
			expect(useTypingStore.getState().totalCharsTyped).toBe(0);
			expect(useTypingStore.getState().currentWordIndex).toBe(0);
		});

		it("calls init if no engine exists", () => {
			useTypingStore.getState().reset();
			expect(useTypingStore.getState().engine).not.toBeNull();
			expect(useTypingStore.getState().words.length).toBeGreaterThan(0);
		});
	});

	describe("handleKeyPress", () => {
		beforeEach(() => {
			useTypingStore.getState().init();
		});

		function createKeyEvent(
			key: string,
			opts: Partial<KeyboardEvent> = {},
		): KeyboardEvent {
			return {
				key,
				preventDefault: vi.fn(),
				ctrlKey: false,
				metaKey: false,
				altKey: false,
				target: document.createElement("div"),
				...opts,
			} as unknown as KeyboardEvent;
		}

		it("handles character input", () => {
			const firstChar = useTypingStore.getState().words[0].word[0];
			useTypingStore.getState().handleKeyPress(createKeyEvent(firstChar));
			useTypingStore.getState().syncFromEngine();

			expect(useTypingStore.getState().currentCharIndex).toBe(1);
		});

		it("handles space", () => {
			const word = useTypingStore.getState().words[0].word;
			for (const c of word) {
				useTypingStore.getState().handleKeyPress(createKeyEvent(c));
			}
			useTypingStore.getState().handleKeyPress(createKeyEvent(" "));
			useTypingStore.getState().syncFromEngine();

			expect(useTypingStore.getState().currentWordIndex).toBe(1);
		});

		it("handles backspace", () => {
			const firstChar = useTypingStore.getState().words[0].word[0];
			useTypingStore.getState().handleKeyPress(createKeyEvent(firstChar));
			useTypingStore.getState().syncFromEngine();
			expect(useTypingStore.getState().currentCharIndex).toBe(1);

			const e = createKeyEvent("Backspace");
			useTypingStore.getState().handleKeyPress(e);
			useTypingStore.getState().syncFromEngine();

			expect(e.preventDefault).toHaveBeenCalled();
			expect(useTypingStore.getState().currentCharIndex).toBe(0);
		});

		it("handles ctrl+backspace", () => {
			const word = useTypingStore.getState().words[0].word;
			for (const c of word.slice(0, 3)) {
				useTypingStore.getState().handleKeyPress(createKeyEvent(c));
			}

			useTypingStore
				.getState()
				.handleKeyPress(createKeyEvent("Backspace", { ctrlKey: true }));
			useTypingStore.getState().syncFromEngine();

			expect(useTypingStore.getState().currentCharIndex).toBe(0);
		});

		it("prevents default on Tab", () => {
			const e = createKeyEvent("Tab");
			useTypingStore.getState().handleKeyPress(e);
			expect(e.preventDefault).toHaveBeenCalled();
		});

		it("Enter restarts when complete", () => {
			// Force complete
			useTypingStore.setState({ isComplete: true });

			const e = createKeyEvent("Enter");
			useTypingStore.getState().handleKeyPress(e);

			expect(e.preventDefault).toHaveBeenCalled();
			// reset should have been called, isComplete back to false
			expect(useTypingStore.getState().isComplete).toBe(false);
		});

		it("ignores input when complete (non-Enter)", () => {
			useTypingStore.setState({ isComplete: true });
			const before = useTypingStore.getState().totalCharsTyped;

			useTypingStore.getState().handleKeyPress(createKeyEvent("a"));
			expect(useTypingStore.getState().totalCharsTyped).toBe(before);
		});

		it("ignores input from INPUT elements", () => {
			const e = createKeyEvent("a", {
				target: document.createElement("input"),
			} as unknown as Partial<KeyboardEvent>);

			const before = useTypingStore.getState().currentCharIndex;
			useTypingStore.getState().handleKeyPress(e);
			expect(useTypingStore.getState().currentCharIndex).toBe(before);
		});

		it("ignores input from TEXTAREA elements", () => {
			const e = createKeyEvent("a", {
				target: document.createElement("textarea"),
			} as unknown as Partial<KeyboardEvent>);

			const before = useTypingStore.getState().currentCharIndex;
			useTypingStore.getState().handleKeyPress(e);
			expect(useTypingStore.getState().currentCharIndex).toBe(before);
		});

		it("ignores input from contentEditable elements", () => {
			const div = document.createElement("div");
			Object.defineProperty(div, "isContentEditable", { value: true });
			const e = createKeyEvent("a", {
				target: div,
			} as unknown as Partial<KeyboardEvent>);

			const before = useTypingStore.getState().currentCharIndex;
			useTypingStore.getState().handleKeyPress(e);
			expect(useTypingStore.getState().currentCharIndex).toBe(before);
		});

		it("ignores ctrl+key combinations", () => {
			const before = useTypingStore.getState().currentCharIndex;
			useTypingStore
				.getState()
				.handleKeyPress(createKeyEvent("a", { ctrlKey: true }));
			expect(useTypingStore.getState().currentCharIndex).toBe(before);
		});

		it("ignores meta+key combinations", () => {
			const before = useTypingStore.getState().currentCharIndex;
			useTypingStore
				.getState()
				.handleKeyPress(createKeyEvent("a", { metaKey: true }));
			expect(useTypingStore.getState().currentCharIndex).toBe(before);
		});

		it("ignores alt+key combinations", () => {
			const before = useTypingStore.getState().currentCharIndex;
			useTypingStore
				.getState()
				.handleKeyPress(createKeyEvent("a", { altKey: true }));
			expect(useTypingStore.getState().currentCharIndex).toBe(before);
		});

		it("ignores multi-char keys (like Shift, Control)", () => {
			const before = useTypingStore.getState().currentCharIndex;
			useTypingStore.getState().handleKeyPress(createKeyEvent("Shift"));
			expect(useTypingStore.getState().currentCharIndex).toBe(before);
		});

		it("does nothing when engine is null", () => {
			useTypingStore.setState({ engine: null });
			// Should not throw
			useTypingStore.getState().handleKeyPress(createKeyEvent("a"));
		});
	});

	describe("setDuration", () => {
		it("changes duration and re-initializes", () => {
			useTypingStore.getState().init();
			useTypingStore.getState().setDuration(60);

			const state = useTypingStore.getState();
			expect(state.duration).toBe(60);
			expect(state.timeRemaining).toBe(60);
			expect(state.engine).not.toBeNull();
		});

		it("does nothing while running", () => {
			useTypingStore.getState().init();
			// Start the engine
			useTypingStore.getState().engine!.handleChar("a");
			useTypingStore.getState().syncFromEngine();

			useTypingStore.getState().setDuration(60);
			expect(useTypingStore.getState().duration).toBe(30); // unchanged
		});
	});

	describe("setMode", () => {
		it("changes mode and re-initializes", () => {
			useTypingStore.getState().init();
			useTypingStore.getState().setMode("custom");

			const state = useTypingStore.getState();
			expect(state.mode).toBe("custom");
			expect(state.engine).not.toBeNull();
		});

		it("does nothing while running", () => {
			useTypingStore.getState().init();
			useTypingStore.getState().engine!.handleChar("a");
			useTypingStore.getState().syncFromEngine();

			useTypingStore.getState().setMode("custom");
			expect(useTypingStore.getState().mode).toBe("words"); // unchanged
		});
	});

	describe("syncFromEngine", () => {
		it("does nothing when engine is null", () => {
			useTypingStore.setState({ engine: null });
			// Should not throw
			useTypingStore.getState().syncFromEngine();
			expect(useTypingStore.getState().words).toEqual([]);
		});

		it("syncs all state from engine", () => {
			useTypingStore.getState().init();
			const { engine } = useTypingStore.getState();

			engine!.handleChar("a");
			useTypingStore.getState().syncFromEngine();

			expect(useTypingStore.getState().totalCharsTyped).toBe(1);
			expect(useTypingStore.getState().isRunning).toBe(true);
		});
	});
});
