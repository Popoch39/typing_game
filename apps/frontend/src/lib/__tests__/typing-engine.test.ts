import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EngineCallbacks, TypingEngine } from "../typing-engine";

function createCallbacks(): EngineCallbacks {
	return {
		onStateChange: vi.fn(),
		onTick: vi.fn(),
		onComplete: vi.fn(),
	};
}

function createEngine(
	words = ["hello", "world"],
	duration = 30,
	mode = "words",
	callbacks?: EngineCallbacks,
) {
	const cb = callbacks ?? createCallbacks();
	return { engine: new TypingEngine(words, duration, mode, cb), callbacks: cb };
}

describe("TypingEngine", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("constructor & getState", () => {
		it("initializes with correct default state", () => {
			const { engine } = createEngine(["hello", "world"], 60, "words");
			const state = engine.getState();

			expect(state.words).toHaveLength(2);
			expect(state.currentWordIndex).toBe(0);
			expect(state.currentCharIndex).toBe(0);
			expect(state.timeRemaining).toBe(60);
			expect(state.duration).toBe(60);
			expect(state.mode).toBe("words");
			expect(state.isRunning).toBe(false);
			expect(state.isComplete).toBe(false);
			expect(state.wpm).toBe(0);
			expect(state.rawWpm).toBe(0);
			expect(state.accuracy).toBe(100);
			expect(state.wpmHistory).toEqual([]);
			expect(state.correctChars).toBe(0);
			expect(state.incorrectChars).toBe(0);
			expect(state.totalCharsTyped).toBe(0);
		});

		it("initializes word states correctly", () => {
			const { engine } = createEngine(["abc"]);
			const state = engine.getState();

			expect(state.words[0].word).toBe("abc");
			expect(state.words[0].typed).toBe("");
			expect(state.words[0].completed).toBe(false);
			expect(state.words[0].chars).toEqual([
				{ char: "a", state: "pending" },
				{ char: "b", state: "pending" },
				{ char: "c", state: "pending" },
			]);
		});
	});

	describe("handleChar", () => {
		it("marks correct characters", () => {
			const { engine, callbacks } = createEngine(["hi"]);
			engine.handleChar("h");
			vi.advanceTimersByTime(16); // flush rAF

			const state = engine.getState();
			expect(state.words[0].chars[0].state).toBe("correct");
			expect(state.currentCharIndex).toBe(1);
			expect(state.correctChars).toBe(1);
			expect(state.totalCharsTyped).toBe(1);
			expect(callbacks.onStateChange).toHaveBeenCalled();
		});

		it("marks incorrect characters", () => {
			const { engine } = createEngine(["hi"]);
			engine.handleChar("x");

			const state = engine.getState();
			expect(state.words[0].chars[0].state).toBe("incorrect");
			expect(state.incorrectChars).toBe(1);
		});

		it("handles extra characters beyond word length", () => {
			const { engine } = createEngine(["ab"]);
			engine.handleChar("a");
			engine.handleChar("b");
			engine.handleChar("c");

			const state = engine.getState();
			expect(state.words[0].chars).toHaveLength(3);
			expect(state.words[0].chars[2]).toEqual({ char: "c", state: "extra" });
			expect(state.currentCharIndex).toBe(3);
			expect(state.incorrectChars).toBe(1);
		});

		it("updates typed string", () => {
			const { engine } = createEngine(["hi"]);
			engine.handleChar("h");
			engine.handleChar("i");

			expect(engine.getState().words[0].typed).toBe("hi");
		});

		it("starts the timer on first char", () => {
			const { engine } = createEngine(["hi"], 30);
			expect(engine.getState().isRunning).toBe(false);

			engine.handleChar("h");
			expect(engine.getState().isRunning).toBe(true);
		});

		it("does nothing when complete", () => {
			const { engine } = createEngine(["a"]);
			engine.handleChar("a");
			engine.handleSpace(); // completes (only 1 word)

			const stateBefore = engine.getState();
			engine.handleChar("x");
			const stateAfter = engine.getState();

			expect(stateAfter.totalCharsTyped).toBe(stateBefore.totalCharsTyped);
		});

		it("does nothing when currentWord is undefined", () => {
			const { engine } = createEngine([]);
			engine.handleChar("a");
			expect(engine.getState().totalCharsTyped).toBe(0);
		});
	});

	describe("handleSpace", () => {
		it("moves to the next word", () => {
			const { engine, callbacks } = createEngine(["hi", "ok"]);
			engine.handleChar("h");
			engine.handleChar("i");
			engine.handleSpace();

			// Flush rAF (scheduleStateChange uses requestAnimationFrame)
			vi.advanceTimersByTime(16);

			const state = engine.getState();
			expect(state.currentWordIndex).toBe(1);
			expect(state.currentCharIndex).toBe(0);
			expect(state.words[0].completed).toBe(true);
			expect(callbacks.onStateChange).toHaveBeenCalled();
		});

		it("marks remaining chars as missed when spacing early", () => {
			const { engine } = createEngine(["hello", "world"]);
			engine.handleChar("h");
			engine.handleSpace();

			const state = engine.getState();
			expect(state.words[0].chars[0].state).toBe("correct");
			expect(state.words[0].chars[1].state).toBe("missed");
			expect(state.words[0].chars[2].state).toBe("missed");
			expect(state.words[0].chars[3].state).toBe("missed");
			expect(state.words[0].chars[4].state).toBe("missed");
		});

		it("counts space in totalCharsTyped but not as correct", () => {
			const { engine } = createEngine(["a", "b"]);
			engine.handleChar("a");
			engine.handleSpace();

			const state = engine.getState();
			// 'a' correct = 1, space is not a correct char
			expect(state.correctChars).toBe(1);
			expect(state.totalCharsTyped).toBe(2);
		});

		it("counts missed chars as incorrect when spacing early", () => {
			const { engine } = createEngine(["hello", "world"]);
			engine.handleSpace(); // skip entire "hello" — 5 missed

			const state = engine.getState();
			expect(state.incorrectChars).toBe(5);
		});

		it("completes the game when all words are done", () => {
			const { engine, callbacks } = createEngine(["ab"]);
			engine.handleChar("a");
			engine.handleChar("b");
			engine.handleSpace();

			expect(engine.getState().isComplete).toBe(true);
			expect(callbacks.onComplete).toHaveBeenCalled();
		});

		it("does nothing when complete", () => {
			const { engine } = createEngine(["a"]);
			engine.handleChar("a");
			engine.handleSpace();

			const stateBefore = engine.getState();
			engine.handleSpace();
			expect(engine.getState().currentWordIndex).toBe(
				stateBefore.currentWordIndex,
			);
		});

		it("does nothing when currentWord is undefined", () => {
			const { engine } = createEngine([]);
			engine.handleSpace();
			expect(engine.getState().currentWordIndex).toBe(0);
		});

		it("starts timer on first space", () => {
			const { engine } = createEngine(["a", "b"]);
			expect(engine.getState().isRunning).toBe(false);
			engine.handleSpace();
			expect(engine.getState().isRunning).toBe(true);
		});

		it("skips word with 0 points when no chars typed", () => {
			const { engine } = createEngine(["hello", "world"]);
			engine.handleSpace(); // skip "hello"

			const state = engine.getState();
			expect(state.score).toBe(0);
			expect(state.lastWordScore).toBe(0);
			expect(state.currentWordIndex).toBe(1);
			expect(state.words[0].completed).toBe(true);
			expect(state.words[0].hadError).toBe(true);
		});

		it("marks all chars as missed when skipping", () => {
			const { engine } = createEngine(["hello", "world"]);
			engine.handleSpace();

			const state = engine.getState();
			for (const c of state.words[0].chars) {
				expect(c.state).toBe("missed");
			}
		});

		it("halves combo when skipping word", () => {
			const { engine } = createEngine(["aa", "bb", "cc", "dd", "ee", "ff"]);
			// Build combo with perfect words
			for (const c of "aa") engine.handleChar(c);
			engine.handleSpace(); // combo 1.25
			for (const c of "bb") engine.handleChar(c);
			engine.handleSpace(); // combo 1.5
			for (const c of "cc") engine.handleChar(c);
			engine.handleSpace(); // combo 1.75
			for (const c of "dd") engine.handleChar(c);
			engine.handleSpace(); // combo 2.0

			const comboBefore = engine.getState().combo;
			expect(comboBefore).toBe(2.0);

			engine.handleSpace(); // skip "ee" → combo halved to 1.0
			expect(engine.getState().combo).toBe(1.0);
		});

		it("spam space keeps score at 0 and combo at 1.0", () => {
			const { engine } = createEngine(["aa", "bb", "cc", "dd"]);
			engine.handleSpace();
			engine.handleSpace();
			engine.handleSpace();

			const state = engine.getState();
			expect(state.score).toBe(0);
			expect(state.combo).toBe(1.0);
			expect(state.currentWordIndex).toBe(3);
		});

		it("completes game when skipping last word", () => {
			const { engine, callbacks } = createEngine(["only"]);
			engine.handleSpace();

			expect(engine.getState().isComplete).toBe(true);
			expect(callbacks.onComplete).toHaveBeenCalled();
		});

		it("gives partial points with hadError for incomplete word", () => {
			const { engine } = createEngine(["hello", "world"]);
			engine.handleChar("h"); // 1 correct out of 5
			engine.handleSpace();

			const state = engine.getState();
			expect(state.score).toBeGreaterThan(0); // partial points
			expect(state.words[0].hadError).toBe(true); // missed chars
			expect(state.lastWordIsPerfect).toBe(false);
		});

		it("gives full points and increases combo for perfect word", () => {
			const { engine } = createEngine(["hi", "ok"]);
			for (const c of "hi") engine.handleChar(c);
			engine.handleSpace();

			const state = engine.getState();
			expect(state.score).toBeGreaterThan(0);
			expect(state.combo).toBe(1.25);
			expect(state.lastWordIsPerfect).toBe(true);
		});
	});

	describe("handleBackspace", () => {
		it("deletes the last typed character", () => {
			const { engine } = createEngine(["hi"]);
			engine.handleChar("h");
			engine.handleBackspace();

			const state = engine.getState();
			expect(state.currentCharIndex).toBe(0);
			expect(state.words[0].chars[0].state).toBe("pending");
			expect(state.words[0].typed).toBe("");
		});

		it("removes extra characters", () => {
			const { engine } = createEngine(["ab"]);
			engine.handleChar("a");
			engine.handleChar("b");
			engine.handleChar("c"); // extra

			engine.handleBackspace();
			const state = engine.getState();
			expect(state.words[0].chars).toHaveLength(2);
			expect(state.currentCharIndex).toBe(2);
		});

		it("goes back to previous word if it has errors", () => {
			const { engine } = createEngine(["hi", "ok"]);
			engine.handleChar("x"); // incorrect
			engine.handleChar("i");
			engine.handleSpace();

			expect(engine.getState().currentWordIndex).toBe(1);

			engine.handleBackspace();
			const state = engine.getState();
			expect(state.currentWordIndex).toBe(0);
			expect(state.words[0].completed).toBe(false);
			expect(state.currentCharIndex).toBe(2); // end of typed
		});

		it("does NOT go back to previous word if it was correct", () => {
			const { engine } = createEngine(["hi", "ok"]);
			engine.handleChar("h");
			engine.handleChar("i");
			engine.handleSpace();

			expect(engine.getState().currentWordIndex).toBe(1);

			engine.handleBackspace();
			expect(engine.getState().currentWordIndex).toBe(1);
		});

		it("goes back to previous word with missed chars (spaced early)", () => {
			const { engine } = createEngine(["hello", "ok"]);
			engine.handleChar("h");
			engine.handleSpace(); // e, l, l, o are missed

			engine.handleBackspace();
			const state = engine.getState();
			expect(state.currentWordIndex).toBe(0);
			// missed chars should be reset to pending
			expect(state.words[0].chars[1].state).toBe("pending");
			expect(state.words[0].chars[4].state).toBe("pending");
		});

		it("goes back to previous word with extra chars", () => {
			const { engine } = createEngine(["ab", "cd"]);
			engine.handleChar("a");
			engine.handleChar("b");
			engine.handleChar("x"); // extra
			engine.handleSpace();

			engine.handleBackspace();
			expect(engine.getState().currentWordIndex).toBe(0);
		});

		it("undoes space and missed counts when going back to previous word", () => {
			const { engine } = createEngine(["hi", "ok"]);
			engine.handleChar("x"); // incorrect
			engine.handleSpace(); // 'i' missed = 1 incorrect more

			const beforeBack = engine.getState();
			expect(beforeBack.incorrectChars).toBe(2); // 'x' incorrect + 'i' missed

			engine.handleBackspace();
			const afterBack = engine.getState();

			expect(afterBack.totalCharsTyped).toBe(beforeBack.totalCharsTyped - 1);
			// missed 'i' should be undone
			expect(afterBack.incorrectChars).toBe(1); // only 'x' remains
		});

		it("does nothing at the very beginning", () => {
			const { engine, callbacks } = createEngine(["hi"]);
			callbacks.onStateChange.mockClear();
			engine.handleBackspace();

			// Still calls onStateChange but position unchanged
			const state = engine.getState();
			expect(state.currentWordIndex).toBe(0);
			expect(state.currentCharIndex).toBe(0);
		});

		it("does nothing when complete", () => {
			const { engine } = createEngine(["a"]);
			engine.handleChar("a");
			engine.handleSpace();
			expect(engine.getState().isComplete).toBe(true);

			engine.handleBackspace();
			expect(engine.getState().isComplete).toBe(true);
		});

		it("does nothing when currentWord is undefined", () => {
			const { engine } = createEngine([]);
			engine.handleBackspace();
			expect(engine.getState().currentWordIndex).toBe(0);
		});
	});

	describe("handleCtrlBackspace", () => {
		it("clears the current word entirely", () => {
			const { engine } = createEngine(["hello"]);
			engine.handleChar("h");
			engine.handleChar("e");
			engine.handleChar("l");

			engine.handleCtrlBackspace();
			const state = engine.getState();
			expect(state.currentCharIndex).toBe(0);
			expect(state.words[0].typed).toBe("");
			expect(state.words[0].chars.every((c) => c.state === "pending")).toBe(
				true,
			);
		});

		it("removes extra characters when clearing", () => {
			const { engine } = createEngine(["ab"]);
			engine.handleChar("a");
			engine.handleChar("b");
			engine.handleChar("x"); // extra

			engine.handleCtrlBackspace();
			const state = engine.getState();
			expect(state.words[0].chars).toHaveLength(2); // back to original length
			expect(state.currentCharIndex).toBe(0);
		});

		it("does nothing when complete", () => {
			const { engine } = createEngine(["a"]);
			engine.handleChar("a");
			engine.handleSpace();

			engine.handleCtrlBackspace();
			expect(engine.getState().isComplete).toBe(true);
		});

		it("does nothing when currentWord is undefined", () => {
			const { engine } = createEngine([]);
			engine.handleCtrlBackspace();
			expect(engine.getState().currentCharIndex).toBe(0);
		});
	});

	describe("hadError tracking", () => {
		it("starts with hadError = false", () => {
			const { engine } = createEngine(["hello"]);
			expect(engine.getState().words[0].hadError).toBe(false);
		});

		it("sets hadError = true on incorrect char", () => {
			const { engine } = createEngine(["hello"]);
			engine.handleChar("x");
			expect(engine.getState().words[0].hadError).toBe(true);
		});

		it("sets hadError = true on extra char", () => {
			const { engine } = createEngine(["ab"]);
			engine.handleChar("a");
			engine.handleChar("b");
			engine.handleChar("x"); // extra
			expect(engine.getState().words[0].hadError).toBe(true);
		});

		it("sets hadError = true on backspace", () => {
			const { engine } = createEngine(["hello"]);
			engine.handleChar("h");
			engine.handleBackspace();
			expect(engine.getState().words[0].hadError).toBe(true);
		});

		it("does NOT reset hadError on regular backspace", () => {
			const { engine } = createEngine(["hello"]);
			engine.handleChar("x"); // incorrect → hadError = true
			engine.handleBackspace();
			expect(engine.getState().words[0].hadError).toBe(true);
		});

		it("resets hadError on ctrl+backspace (fresh start)", () => {
			const { engine } = createEngine(["hello"]);
			engine.handleChar("x"); // incorrect → hadError = true
			engine.handleCtrlBackspace();
			expect(engine.getState().words[0].hadError).toBe(false);
		});

		it("keeps hadError = false for perfectly typed word", () => {
			const { engine } = createEngine(["hi", "ok"]);
			engine.handleChar("h");
			engine.handleChar("i");
			expect(engine.getState().words[0].hadError).toBe(false);
		});

		it("each word tracks hadError independently", () => {
			const { engine } = createEngine(["hi", "ok"]);
			engine.handleChar("x"); // incorrect on word 0
			engine.handleChar("i");
			engine.handleSpace();
			engine.handleChar("o");
			engine.handleChar("k");
			expect(engine.getState().words[0].hadError).toBe(true);
			expect(engine.getState().words[1].hadError).toBe(false);
		});
	});

	describe("scoring integration", () => {
		it("starts with score=0, combo=1.0", () => {
			const { engine } = createEngine(["hello"]);
			const state = engine.getState();
			expect(state.score).toBe(0);
			expect(state.combo).toBe(1.0);
			expect(state.lastWordScore).toBe(0);
		});

		it("scores word on space", () => {
			const { engine } = createEngine(["hello", "world"]);
			for (const c of "hello") engine.handleChar(c);
			engine.handleSpace();
			const state = engine.getState();
			expect(state.score).toBeGreaterThan(0);
			expect(state.lastWordScore).toBeGreaterThan(0);
		});

		it("resets scoring on engine reset", () => {
			const { engine } = createEngine(["hello", "world"]);
			for (const c of "hello") engine.handleChar(c);
			engine.handleSpace();
			expect(engine.getState().score).toBeGreaterThan(0);
			engine.reset();
			expect(engine.getState().score).toBe(0);
			expect(engine.getState().combo).toBe(1.0);
		});
	});

	describe("timer and completion", () => {
		it("timer ticks and calls onTick", () => {
			const { engine, callbacks } = createEngine(["hello"], 1);
			engine.handleChar("h"); // starts timer

			vi.advanceTimersByTime(200);
			expect(callbacks.onTick).toHaveBeenCalled();
		});

		it("completes when time runs out", () => {
			const { engine, callbacks } = createEngine(["hello"], 1);
			engine.handleChar("h");

			vi.advanceTimersByTime(1200);
			expect(engine.getState().isComplete).toBe(true);
			expect(engine.getState().isRunning).toBe(false);
			expect(callbacks.onComplete).toHaveBeenCalled();
		});

		it("marks remaining chars as missed on time-out", () => {
			const { engine } = createEngine(["hello"], 1);
			engine.handleChar("h");
			engine.handleChar("e");

			vi.advanceTimersByTime(1200);
			const state = engine.getState();
			expect(state.words[0].chars[2].state).toBe("missed");
			expect(state.words[0].chars[3].state).toBe("missed");
			expect(state.words[0].chars[4].state).toBe("missed");
		});

		it("records wpmHistory during timer ticks", () => {
			const { engine } = createEngine(["hello", "world"], 5);
			// Type some chars
			for (const c of "hello") engine.handleChar(c);
			engine.handleSpace();

			vi.advanceTimersByTime(1200);
			expect(engine.getState().wpmHistory.length).toBeGreaterThan(0);
		});

		it("does not start timer twice", () => {
			const { engine } = createEngine(["hello"]);
			engine.handleChar("h"); // starts
			engine.handleChar("e"); // should not restart

			expect(engine.getState().isRunning).toBe(true);
		});

		it("completes via handleSpace when all words typed (timer running)", () => {
			const { engine, callbacks } = createEngine(["ab"], 30);
			engine.handleChar("a");
			engine.handleChar("b");
			// Timer is running, complete via space (all words done)
			engine.handleSpace();

			expect(engine.getState().isComplete).toBe(true);
			expect(engine.getState().isRunning).toBe(false);
			expect(callbacks.onComplete).toHaveBeenCalled();

			// Timer should be cleared — no more ticks
			callbacks.onTick.mockClear();
			vi.advanceTimersByTime(500);
			expect(callbacks.onTick).not.toHaveBeenCalled();
		});

		it("does not mark completed word as missed on timeout", () => {
			const { engine } = createEngine(["ab", "cd"], 1);
			engine.handleChar("a");
			engine.handleChar("b");
			engine.handleSpace(); // word 0 complete, on word 1

			vi.advanceTimersByTime(1200);
			// Word 0 should remain as-is (completed)
			expect(engine.getState().words[0].chars[0].state).toBe("correct");
			expect(engine.getState().words[0].chars[1].state).toBe("correct");
		});
	});

	describe("WPM and accuracy calculations", () => {
		it("calculates WPM based on correct chars", () => {
			const { engine } = createEngine(["hello", "world"], 60);
			// Type "hello " = 5 correct + 1 space = 6 correct chars
			for (const c of "hello") engine.handleChar(c);
			engine.handleSpace();

			// Advance time to 12 seconds
			vi.advanceTimersByTime(12000);

			const state = engine.getState();
			// WPM = (correctChars / 5) / elapsedMinutes
			// 6 / 5 / (12/60) = 1.2 / 0.2 = 6
			expect(state.wpm).toBeGreaterThan(0);
		});

		it("calculates rawWpm based on total chars typed", () => {
			const { engine } = createEngine(["hi"], 60);
			engine.handleChar("x"); // incorrect
			engine.handleChar("i"); // correct

			vi.advanceTimersByTime(1000);
			const state = engine.getState();
			expect(state.rawWpm).toBeGreaterThan(0);
		});

		it("calculates accuracy correctly", () => {
			const { engine } = createEngine(["hi"]);
			engine.handleChar("h"); // correct
			engine.handleChar("x"); // incorrect

			const state = engine.getState();
			// accuracy = correct / (correct + incorrect) * 100 = 1/2 * 100 = 50
			expect(state.accuracy).toBe(50);
		});

		it("returns 100% accuracy when nothing typed", () => {
			const { engine } = createEngine(["hi"]);
			expect(engine.getState().accuracy).toBe(100);
		});

		it("returns 0 WPM before timer starts", () => {
			const { engine } = createEngine(["hi"]);
			expect(engine.getState().wpm).toBe(0);
			expect(engine.getState().rawWpm).toBe(0);
		});
	});

	describe("reset", () => {
		it("resets to initial state", () => {
			const { engine, callbacks } = createEngine(["hi", "ok"]);
			engine.handleChar("h");
			engine.handleChar("i");
			engine.handleSpace();

			callbacks.onStateChange.mockClear();
			engine.reset();

			const state = engine.getState();
			expect(state.currentWordIndex).toBe(0);
			expect(state.currentCharIndex).toBe(0);
			expect(state.isRunning).toBe(false);
			expect(state.isComplete).toBe(false);
			expect(state.correctChars).toBe(0);
			expect(state.incorrectChars).toBe(0);
			expect(state.totalCharsTyped).toBe(0);
			expect(state.wpmHistory).toEqual([]);
			expect(state.words[0].chars.every((c) => c.state === "pending")).toBe(
				true,
			);
			expect(callbacks.onStateChange).toHaveBeenCalled();
		});

		it("resets with new words", () => {
			const { engine } = createEngine(["hi"]);
			engine.handleChar("h");

			engine.reset(["new", "words"]);
			const state = engine.getState();
			expect(state.words).toHaveLength(2);
			expect(state.words[0].word).toBe("new");
			expect(state.words[1].word).toBe("words");
		});

		it("resets without new words (uses same words)", () => {
			const { engine } = createEngine(["hi", "ok"]);
			engine.handleChar("x");

			engine.reset();
			const state = engine.getState();
			expect(state.words[0].word).toBe("hi");
			expect(state.words[0].chars[0].state).toBe("pending");
		});

		it("clears the timer on reset", () => {
			const { engine, callbacks } = createEngine(["hello"], 5);
			engine.handleChar("h");
			expect(engine.getState().isRunning).toBe(true);

			engine.reset();
			callbacks.onTick.mockClear();

			vi.advanceTimersByTime(1000);
			expect(callbacks.onTick).not.toHaveBeenCalled();
		});
	});

	describe("destroy", () => {
		it("clears the interval timer", () => {
			const { engine, callbacks } = createEngine(["hello"], 5);
			engine.handleChar("h");

			engine.destroy();
			callbacks.onTick.mockClear();

			vi.advanceTimersByTime(1000);
			expect(callbacks.onTick).not.toHaveBeenCalled();
		});

		it("does nothing when no timer is running", () => {
			const { engine } = createEngine(["hello"]);
			// Should not throw
			engine.destroy();
		});
	});
});
