# Scoring Rebalance: WPM/Combo Parity

**Date:** 2026-03-14
**Goal:** Rebalance scoring so WPM and combo contribute equally to the final score, instead of combo dominating.

## Problem

Current scoring has combo (×1→×5) as dominant factor. A slow-but-perfect player crushes a fast-but-imperfect one (up to 7.5:1 ratio). WPM only acts as a linear multiplier (×0.2→~×2.5) on a combo-inflated total.

## Design

### 1. Reduce combo cap: 5.0 → 3.0

In `ScoringEngine.scoreWord()`:

```ts
this.combo = Math.min(3.0, this.combo + 0.25);
```

Combo reaches max in 8 perfect words (was 16). Less dominant, more accessible.

### 2. Additive final score formula

Replace multiplicative formula with additive one in `ScoringEngine.computeFinalScore()`:

**Before:** `totalScore × wpmMultiplier + timeBonus × wpmMultiplier`
**After:** `totalScore + wpmBonus + timeBonus`

```ts
computeFinalScore(wpm: number, wordsCompleted: number, remainingSeconds: number): number {
    const wpmBonus = Math.floor(wpm * wordsCompleted * 2);
    const timeBonus = remainingSeconds > 0 ? Math.floor(remainingSeconds * 10) : 0;
    return this.totalScore + wpmBonus + timeBonus;
}
```

- `totalScore` — accumulated combo-boosted points (combo axis)
- `wpmBonus` — speed contribution, scales with words typed (WPM axis)
- `timeBonus` — flat bonus for finishing early (no longer WPM-scaled)

New parameter `wordsCompleted` required.

### 3. Files to modify

| File | Change |
|------|--------|
| `packages/shared/src/scoring-engine.ts` | Combo cap + new formula |
| `apps/ws/src/typing-tracker.ts` | Pass `wordsCompleted` to `computeFinalScore` |
| `packages/shared/src/__tests__/scoring-engine.test.ts` | Update all tests |
| `apps/ws/src/__tests__/typing-tracker.test.ts` | Update `computeFinalScore` tests |

No frontend changes — it receives the final score via WebSocket.

## Balance simulation (20 medium words, 60s)

| Profile | Avg combo | WPM | totalScore | wpmBonus | finalScore |
|---------|----------|-----|-----------|----------|------------|
| Fast + errors | ×1.2 | 100 | ~640 | 4000 | ~4640 |
| Slow + perfect | ×2.8 | 50 | ~1890 | 2000 | ~3890 |
| Balanced | ×2.0 | 75 | ~1350 | 3000 | ~4350 |

Ratio between extremes: ~1.2:1 (was ~7.5:1). Balanced player wins.
