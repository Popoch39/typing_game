# Scoring & Combo System Design

## Context
Current game only tracks WPM + accuracy — not engaging. Need a scoring system that creates tension, rewards both speed and precision, and makes multiplayer more exciting.

**Target**: Competitive/esport players. Pure skill, no power-ups.

---

## Core Mechanics

### 1. Per-Word Base Points (by length)

| Chars | Points |
|-------|--------|
| 1-3   | 10     |
| 4-6   | 25     |
| 7-9   | 50     |
| 10+   | 75     |

### 2. Perfect Word Detection

A word is **perfect** if the player typed every character correctly on the first attempt — no incorrect chars, no backspace used during that word.

**Implementation**: Add a `hadError: boolean` flag per word in `WordState`. Set to `true` on first incorrect char OR first backspace within that word. `Ctrl+Backspace` resets the word AND resets `hadError = false` (fresh start). Regular backspace does NOT reset `hadError`.

This is new state — the existing `correctChars`/`incorrectChars` counters are session-level, not per-word.

### 3. Accuracy Bonus
- Perfect word (hadError === false) = **1.5x** base points
- Any error in the word = 1.0x (no bonus)

### 4. Combo Multiplier (Progressive Degradation)
- Starts at **1.0x**
- Each **perfect word**: **+0.25x** (cap **5.0x**)
- Each **word with error(s)**: combo **÷ 2**, then `Math.round(result * 4) / 4` (rounds to nearest 0.25, half-up), min 1.0x
  - Examples: 5.0x → 2.5x, 3.0x → 1.5x, 2.0x → 1.0x, 1.75x → 1.0x, 1.25x → 1.0x

### 5. Word Score Formula
```
word_score = floor(base_points * accuracy_bonus * combo_multiplier)
```

### 6. Final Score Formula
```
combo_points = sum(all word_scores)
wpm_multiplier = max(0.2, final_wpm / 50)    // floor at 0.2 to not destroy slow runs
time_bonus = remaining_seconds * 10 * wpm_multiplier  (only if ALL words completed before timer)
final_score = floor(combo_points * wpm_multiplier) + floor(time_bonus)
```

### 7. Score Examples (all timed-out, no time_bonus)

| Scenario | combo_pts | WPM | wpm_mult | final_score |
|----------|-----------|-----|----------|-------------|
| 60 WPM, decent combo | 2000 | 60 | 1.2 | 2400 |
| 100 WPM, high combo | 3500 | 100 | 2.0 | 7000 |
| 120 WPM, broken combo | 1800 | 120 | 2.4 | 4320 |
| 40 WPM, perfect combo | 2800 | 40 | 0.8 | 2240 |

Speed × precision = exponential reward. Strategic tension: go fast or stay accurate?

---

## Multiplayer

- Same scoring system for both players
- **Winner = highest final_score** (not WPM). Change `finishGame()` winner logic from `b.wpm - a.wpm` to `b.score - a.score`
- **Tie-break**: equal final_score → `winner = null` (draw), same as current WPM tie behavior
- WPM + accuracy shown as secondary stats
- Combo visible in real-time to create pressure
- Server must record `completedAt` timestamp per player (for time_bonus calculation)

---

## Visual Feedback

### Per Keystroke
- Correct: brief green flash on character
- Incorrect: brief red flash + subtle shake (2-3px, 100ms)

### Per Word Complete
- Score popup floats up from word position
- Format: "+75 × 1.5 × 3.0x = 337" (base × accuracy × combo = total)
- "PERFECT!" label on perfect words

### Combo Indicator (always visible)
- Displays current multiplier: "1.0x", "2.5x", "5.0x"
- Color ramp: white (1x) → yellow (2x) → orange (3.5x) → red (5x)
- Pulse animation on combo increase
- Shrink animation on combo decrease

### Combo Milestones
- **3.0x+**: glow border on typing area
- **5.0x (max)**: "ON FIRE" state — intensified glow, particle-like effect

### Score Display
- Running total always visible next to WPM/accuracy stats

---

## Server Authority (Multiplayer)

Scoring must be **server-authoritative** to prevent cheating:
- Add `hadError` flag per word + `comboMultiplier` + `totalScore` + `completedAt` to ServerTypingTracker
- `correctChars`/`incorrectChars` are session-level counters (NOT per-word) — scoring uses `hadError` flag instead
- Server calculates and broadcasts scores in `self_stats` and `opponent_progress`
- Client displays server values, does NOT compute its own score in multi

For solo mode: client-side scoring is fine (no cheating concern).

---

## Files to Modify

### Frontend (solo scoring + UI)
- `apps/frontend/src/lib/typing-engine.ts` — add `hadError` per word, combo state, scoring computation
- `apps/frontend/src/stores/use-typing-store.ts` — expose score/combo to UI
- `apps/frontend/src/components/typing/typing-area.tsx` — visual feedback (popups, combo indicator, keystroke effects)

### Server (multiplayer scoring)
- `apps/ws/src/typing-tracker.ts` (exists already) — add `hadError` per word, combo, scoring logic (mirror engine)
- `apps/ws/src/game-room.ts` — include score/combo in `self_stats` + `opponent_progress`, change winner logic to score-based, add `completedAt` tracking
- `packages/shared/src/ws-protocol.ts` — add score/combo/completedAt fields to message types

### Multiplayer UI
- `apps/frontend/src/app/(protected)/multiplayer/page.tsx` — show scores during game
- `apps/frontend/src/components/multiplayer/game-result-screen.tsx` — winner by score
- `apps/frontend/src/components/multiplayer/opponent-progress.tsx` — show opponent score/combo

---

## Verification

1. **Solo**: Type words, verify score increments correctly per formula. Test combo ramp-up and degradation. Test perfect word detection with backspace vs ctrl+backspace. Test time bonus when finishing early.
2. **Multiplayer**: Both players see consistent scores. Winner determined by score. Server values override client.
3. **Edge cases**: 0 WPM → wpm_mult = 0.2 (floor), all errors → score stays minimal, max combo cap at 5x, ctrl+backspace resets hadError.
4. **Tests**: Unit tests for scoring formulas in typing-engine.test.ts and typing-tracker test.
