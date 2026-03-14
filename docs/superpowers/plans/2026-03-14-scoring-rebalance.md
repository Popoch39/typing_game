# Scoring Rebalance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance scoring so WPM and combo contribute equally, using additive formula and reduced combo cap.

**Architecture:** Change `ScoringEngine` (combo cap 5→3, additive `computeFinalScore`), update `ServerTypingTracker` to pass `wordsCompleted`, update all tests TDD-style.

**Tech Stack:** TypeScript, Bun test, Biome

---

## Chunk 1: ScoringEngine changes + tests

### Task 1: Update combo cap tests

**Files:**
- Modify: `packages/shared/src/__tests__/scoring-engine.test.ts`

- [ ] **Step 1: Update the "caps combo at 5.0" test to expect 3.0**

```ts
it("caps combo at 3.0", () => {
    for (let i = 0; i < 20; i++) {
        engine.scoreWord(5, false);
    }
    expect(engine.combo).toBe(3.0);
});
```

- [ ] **Step 1b: Update the "halves combo on error" test for new cap**

The existing test builds combo to 5.0 with 16 iterations. Update to build to 3.0 with 8 iterations and adjust the halving cascade:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && bun test src/__tests__/scoring-engine.test.ts`
Expected: FAIL — combo caps at 5.0 instead of 3.0

### Task 2: Implement combo cap reduction

**Files:**
- Modify: `packages/shared/src/scoring-engine.ts:34`

- [ ] **Step 3: Change combo cap from 5.0 to 3.0**

```ts
this.combo = Math.min(3.0, this.combo + 0.25);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/shared && bun test src/__tests__/scoring-engine.test.ts`
Expected: PASS

### Task 3: Update computeFinalScore tests

**Files:**
- Modify: `packages/shared/src/__tests__/scoring-engine.test.ts`

- [ ] **Step 5: Rewrite the `computeFinalScore` describe block for additive formula**

Replace the entire `describe("computeFinalScore", ...)` block with:

```ts
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
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd packages/shared && bun test src/__tests__/scoring-engine.test.ts`
Expected: FAIL — numeric mismatch (old formula produces different values)

### Task 4: Implement new computeFinalScore

**Files:**
- Modify: `packages/shared/src/scoring-engine.ts:44-52`

- [ ] **Step 7: Replace computeFinalScore with additive formula**

```ts
computeFinalScore(wpm: number, wordsCompleted: number, remainingSeconds: number): number {
    const wpmBonus = Math.floor(wpm * wordsCompleted * 2);
    const timeBonus = remainingSeconds > 0 ? Math.floor(remainingSeconds * 10) : 0;
    return this.totalScore + wpmBonus + timeBonus;
}
```

- [ ] **Step 8: Remove the console.log on line 39**

Delete: `console.log("scoring: ", wordScore);`

- [ ] **Step 9: Run all scoring-engine tests**

Run: `cd packages/shared && bun test src/__tests__/scoring-engine.test.ts`
Expected: ALL PASS

- [ ] **Step 10: Lint**

Run: `cd packages/shared && bunx biome check src/scoring-engine.ts`
Expected: No errors

- [ ] **Step 11: Commit**

```bash
git add packages/shared/src/scoring-engine.ts packages/shared/src/__tests__/scoring-engine.test.ts
git commit -m "feat(scoring): rebalance combo cap to 3.0 and additive final score"
```

## Chunk 2: TypingTracker + game-room updates

### Task 5: Update typing-tracker computeFinalScore test

**Files:**
- Modify: `apps/ws/src/__tests__/typing-tracker.test.ts`

- [ ] **Step 12: Rewrite the "computeFinalScore works" test**

```ts
it("computeFinalScore works", () => {
    const t = createTracker(["hello"]);
    typeWord(t, "hello");
    t.handleSpace();
    const stats = t.getStats(START + 60_000);
    // Perfect: base=25 * 1.5 * 1.0 = 37 total
    expect(stats.score).toBe(37);
    // Final with wpm=50, 1 word: 37 + floor(50*1*2) = 37 + 100 = 137
    expect(t.computeFinalScore(50, 1, 0)).toBe(137);
    // Final with wpm=100, 1 word: 37 + floor(100*1*2) = 37 + 200 = 237
    expect(t.computeFinalScore(100, 1, 0)).toBe(237);
});
```

- [ ] **Step 13: Run test to verify it fails**

Run: `cd apps/ws && bun test src/__tests__/typing-tracker.test.ts`
Expected: FAIL — `computeFinalScore` still takes 2 args

### Task 6: Update typing-tracker proxy method

**Files:**
- Modify: `apps/ws/src/typing-tracker.ts:160-162`

- [ ] **Step 14: Add wordsCompleted parameter to computeFinalScore**

```ts
computeFinalScore(wpm: number, wordsCompleted: number, remainingSeconds: number): number {
    return this.scoringEngine.computeFinalScore(wpm, wordsCompleted, remainingSeconds);
}
```

- [ ] **Step 15: Run typing-tracker tests**

Run: `cd apps/ws && bun test src/__tests__/typing-tracker.test.ts`
Expected: ALL PASS

### Task 7: Update game-room callers

**Files:**
- Modify: `apps/ws/src/game-room.ts:270` and `apps/ws/src/game-room.ts:369`

- [ ] **Step 16: Pass wordsCompleted at line 270 (player completion)**

Before:
```ts
ps.score = ps.tracker.computeFinalScore(stats.wpm, remainingSeconds);
```

After:
```ts
ps.score = ps.tracker.computeFinalScore(stats.wpm, stats.wordIndex, remainingSeconds);
```

- [ ] **Step 17: Pass wordsCompleted at line 369 (game end / non-completers)**

Before:
```ts
ps.score = ps.tracker.computeFinalScore(stats.wpm, 0);
```

After:
```ts
ps.score = ps.tracker.computeFinalScore(stats.wpm, stats.wordIndex, 0);
```

- [ ] **Step 18: Run all WS tests**

Run: `cd apps/ws && bun test`
Expected: ALL PASS

- [ ] **Step 19: Lint WS app**

Run: `cd apps/ws && bunx biome check src/`
Expected: No errors

- [ ] **Step 20: Commit**

```bash
git add apps/ws/src/typing-tracker.ts apps/ws/src/game-room.ts apps/ws/src/__tests__/typing-tracker.test.ts
git commit -m "feat(ws): pass wordsCompleted to rebalanced computeFinalScore"
```
