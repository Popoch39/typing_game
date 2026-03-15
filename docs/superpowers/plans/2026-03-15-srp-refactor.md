# SRP Component Refactor — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor React components to follow SRP, organize loose components into domain folders.

**Architecture:** Split multi-responsibility files into focused single-purpose files. Organize components from flat `components/` root into domain subfolders (`dashboard/`, `layout/`, `rank/`, `toast/`). Update all imports. Ensure existing tests still pass.

**Tech Stack:** React 19, Next.js 16, Biome, Vitest

---

## File Structure

### New directory structure under `apps/frontend/src/components/`:

```
components/
  dashboard/                  # Dashboard-specific widgets
    online-players.tsx        # (move from root)
    quick-stats.tsx           # (move from root)
    recent-matches/
      recent-matches.tsx      # Orchestrator (slimmed)
      match-row.tsx           # Single match row
      match-skeleton.tsx      # Loading skeleton
  layout/                     # App shell components
    sidebar/
      sidebar.tsx             # Main sidebar (slimmed)
      nav-link.tsx            # Single nav link
      sidebar-user-section.tsx # User avatar + rank section
      sidebar-logo.tsx        # Logo header
      nav-config.ts           # navItems + bottomItems data
    theme-toggle.tsx          # (move from root)
  multiplayer/                # (existing, add sub-components)
    game-result-screen/
      game-result-screen.tsx  # Orchestrator (slimmed)
      player-result-card.tsx  # Reusable for self + opponent
      rating-change-badge.tsx # Animated ELO badge
    countdown-screen.tsx      # (stays)
    lobby-screen.tsx          # (stays)
    opponent-progress.tsx     # (stays)
    waiting-screen.tsx        # (stays)
    multiplayer-playing-view.tsx # Extracted from page.tsx
  play-section/               # Game mode selection
    play-section.tsx          # Orchestrator (slimmed)
    game-mode-card.tsx        # Single mode card
    join-room-input.tsx       # Room code input
    room-code-display.tsx     # Room code + copy button
  rank/                       # Rank display components
    rank-badge.tsx            # (from root, only RankBadge)
    rank-avatar.tsx           # (from root, was in rank-badge.tsx)
    streak-badge.tsx          # (from root, was in rank-badge.tsx)
  toast/                      # Game toast system
    game-toast-container.tsx  # Container component
    game-toast-item.tsx       # Single toast component
    toast-store.ts            # Global toast state + showGameToast
    toast-config.ts           # Toast type → icon/color config
  typing/                     # (existing, no changes needed)
  ui/                         # (existing, no changes)
  icons/                      # (existing, no changes)
  user-avatar.tsx             # (stays at root — shared utility)
```

### Utility move:

- `timeAgo()` from `recent-matches.tsx` → `lib/time.ts`

---

## Chunk 1: Leaf Splits (no import chain impact)

### Task 1: Split `rank-badge.tsx` into 3 files

**Files:**
- Read: `apps/frontend/src/components/rank-badge.tsx`
- Create: `apps/frontend/src/components/rank/rank-badge.tsx`
- Create: `apps/frontend/src/components/rank/rank-avatar.tsx`
- Create: `apps/frontend/src/components/rank/streak-badge.tsx`
- Modify: `apps/frontend/src/app/(protected)/leaderboard/page.tsx` (update import)

- [ ] **Step 1: Create `rank/rank-badge.tsx`** — copy `RankBadge` component + its imports/types (lines 1–108 of original)

- [ ] **Step 2: Create `rank/rank-avatar.tsx`** — copy `RankAvatar` component (lines 110–187)

- [ ] **Step 3: Create `rank/streak-badge.tsx`** — copy `StreakBadge` component (lines 189–217)

- [ ] **Step 4: Delete original `components/rank-badge.tsx`**

- [ ] **Step 5: Update import in `leaderboard/page.tsx`**
```tsx
import { RankBadge } from "@/components/rank/rank-badge";
```

- [ ] **Step 6: Search for any other imports of the old path and update them**
```bash
cd apps/frontend && grep -r "rank-badge" src/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 7: Run lint + tests**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 8: Commit**
```bash
git add apps/frontend/src/components/rank/ apps/frontend/src/components/rank-badge.tsx apps/frontend/src/app/
git commit -m "refactor: split rank-badge into RankBadge, RankAvatar, StreakBadge"
```

---

### Task 2: Split `game-toast.tsx` into toast module

**Files:**
- Read: `apps/frontend/src/components/game-toast.tsx`
- Create: `apps/frontend/src/components/toast/toast-config.ts`
- Create: `apps/frontend/src/components/toast/toast-store.ts`
- Create: `apps/frontend/src/components/toast/game-toast-item.tsx`
- Create: `apps/frontend/src/components/toast/game-toast-container.tsx`
- Modify: all files importing from `game-toast`

- [ ] **Step 1: Create `toast/toast-config.ts`** — `ToastType` type + `toastConfig` record (no React, pure data)

- [ ] **Step 2: Create `toast/toast-store.ts`** — `GameToast` interface + `showGameToast` fn + listeners array (no React)

- [ ] **Step 3: Create `toast/game-toast-item.tsx`** — `GameToastItem` component importing from config + store

- [ ] **Step 4: Create `toast/game-toast-container.tsx`** — `GameToastContainer` component importing from store + item

- [ ] **Step 5: Delete original `components/game-toast.tsx`**

- [ ] **Step 6: Update all imports**
```bash
cd apps/frontend && grep -r "game-toast" src/ --include="*.tsx" --include="*.ts"
```
- Callers of `showGameToast` → import from `@/components/toast/toast-store`
- Callers of `GameToastContainer` → import from `@/components/toast/game-toast-container`

- [ ] **Step 7: Run lint + tests**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 8: Commit**
```bash
git add apps/frontend/src/components/toast/ apps/frontend/src/components/game-toast.tsx
git commit -m "refactor: split game-toast into toast module (store, config, components)"
```

---

### Task 3: Extract `timeAgo` to `lib/time.ts`

**Files:**
- Create: `apps/frontend/src/lib/time.ts`
- Modify: `apps/frontend/src/components/recent-matches.tsx` (remove `timeAgo`, add import)

- [ ] **Step 1: Create `lib/time.ts`**
```ts
export function timeAgo(dateStr: string): string {
	const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}
```

- [ ] **Step 2: Update `recent-matches.tsx`** — remove the inline `timeAgo` function, add `import { timeAgo } from "@/lib/time";`

- [ ] **Step 3: Run lint + tests**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 4: Commit**
```bash
git add apps/frontend/src/lib/time.ts apps/frontend/src/components/recent-matches.tsx
git commit -m "refactor: extract timeAgo utility to lib/time.ts"
```

---

### Task 4: Split `game-result-screen.tsx`

**Files:**
- Create: `apps/frontend/src/components/multiplayer/game-result-screen/rating-change-badge.tsx`
- Create: `apps/frontend/src/components/multiplayer/game-result-screen/player-result-card.tsx`
- Create: `apps/frontend/src/components/multiplayer/game-result-screen/game-result-screen.tsx`
- Delete: `apps/frontend/src/components/multiplayer/game-result-screen.tsx`
- Modify: `apps/frontend/src/app/(protected)/multiplayer/page.tsx` (update import path)

- [ ] **Step 1: Create `rating-change-badge.tsx`** — the `RatingChangeBadge` component (lines 13–87 of original) as its own file with its GSAP import

- [ ] **Step 2: Create `player-result-card.tsx`** — extract the duplicated player result block into a reusable component:
```tsx
interface PlayerResultCardProps {
	label: string;
	name?: string;
	score: number;
	wordPoints?: number;
	wpmBonus?: number;
	timeBonus?: number;
	wpm: number;
	rawWpm: number;
	accuracy: number;
	isHighlighted: boolean;
	ratingChange?: { change: number; oldRating?: number; newRating?: number } | null;
	isRanked: boolean;
}
```

- [ ] **Step 3: Create orchestrator `game-result-screen.tsx`** in the folder — uses `PlayerResultCard` for both self + opponent, imports `RatingChangeBadge` indirectly via `PlayerResultCard`

- [ ] **Step 4: Delete original flat file `multiplayer/game-result-screen.tsx`**

- [ ] **Step 5: Update import in `multiplayer/page.tsx`**
```tsx
import { GameResultScreen } from "@/components/multiplayer/game-result-screen/game-result-screen";
```

- [ ] **Step 6: Run lint + tests**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 7: Commit**
```bash
git add apps/frontend/src/components/multiplayer/game-result-screen/ apps/frontend/src/app/
git commit -m "refactor: split game-result-screen into PlayerResultCard + RatingChangeBadge"
```

---

## Chunk 2: Composite Splits

### Task 5: Split `play-section.tsx` into play-section module

**Files:**
- Create: `apps/frontend/src/components/play-section/game-mode-card.tsx`
- Create: `apps/frontend/src/components/play-section/join-room-input.tsx`
- Create: `apps/frontend/src/components/play-section/room-code-display.tsx`
- Create: `apps/frontend/src/components/play-section/play-section.tsx`
- Delete: `apps/frontend/src/components/play-section.tsx`
- Move: `apps/frontend/src/components/__tests__/play-section.test.tsx` → `apps/frontend/src/components/play-section/__tests__/play-section.test.tsx`
- Modify: `apps/frontend/src/app/(protected)/page.tsx` (update import)

- [ ] **Step 1: Create `play-section/game-mode-card.tsx`** — single card rendering for one game mode. Props:
```tsx
interface GameModeCardProps {
	mode: GameMode;
	isActive: boolean;
	isSearching: boolean;
	isWaiting: boolean;
	isBusy: boolean;
	onPlay: () => void;
	onCancel: () => void;
	children?: React.ReactNode; // slot for custom card content (join input, room code)
}
```

- [ ] **Step 2: Create `play-section/join-room-input.tsx`** — the room code input + join button (lines 232–261 of original)

- [ ] **Step 3: Create `play-section/room-code-display.tsx`** — room code display + copy button (lines 197–222 of original)

- [ ] **Step 4: Create orchestrator `play-section/play-section.tsx`** — wires everything together, keeps the `gameModes` config array and state, renders `GameModeCard` for each with appropriate children slots

- [ ] **Step 5: Delete original `components/play-section.tsx`**

- [ ] **Step 6: Move test file**
```bash
mkdir -p apps/frontend/src/components/play-section/__tests__
mv apps/frontend/src/components/__tests__/play-section.test.tsx apps/frontend/src/components/play-section/__tests__/play-section.test.tsx
```

- [ ] **Step 7: Update test import path**
```tsx
import { PlaySection } from "../play-section";
```
(Should still work since it's now `../play-section.tsx` in the same parent folder)

- [ ] **Step 8: Update import in `page.tsx`**
```tsx
import { PlaySection } from "@/components/play-section/play-section";
```

- [ ] **Step 9: Run lint + tests**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 10: Commit**
```bash
git add apps/frontend/src/components/play-section/ apps/frontend/src/components/__tests__/ apps/frontend/src/app/
git commit -m "refactor: split play-section into GameModeCard, JoinRoomInput, RoomCodeDisplay"
```

---

### Task 6: Split `recent-matches.tsx` into module

**Files:**
- Create: `apps/frontend/src/components/dashboard/recent-matches/match-row.tsx`
- Create: `apps/frontend/src/components/dashboard/recent-matches/match-skeleton.tsx`
- Create: `apps/frontend/src/components/dashboard/recent-matches/recent-matches.tsx`
- Delete: `apps/frontend/src/components/recent-matches.tsx`
- Move: `apps/frontend/src/components/__tests__/recent-matches.test.tsx` → `apps/frontend/src/components/dashboard/recent-matches/__tests__/recent-matches.test.tsx`
- Modify: `apps/frontend/src/app/(protected)/page.tsx` (update import)

- [ ] **Step 1: Create `dashboard/recent-matches/match-skeleton.tsx`** — the `MatchSkeleton` component (lines 23–47 of original)

- [ ] **Step 2: Create `dashboard/recent-matches/match-row.tsx`** — extract the match row from the `.map()` callback into a dedicated component. Props:
```tsx
interface MatchRowProps {
	match: MatchResult;
	userId: string;
	userName: string;
	userImage?: string | null;
	index: number;
}
```

- [ ] **Step 3: Create orchestrator `dashboard/recent-matches/recent-matches.tsx`** — handles data fetching (useSession, useMyMatchHistory), renders header/empty/loading/list using MatchRow + MatchSkeleton

- [ ] **Step 4: Delete original `components/recent-matches.tsx`**

- [ ] **Step 5: Move + update test file**
```bash
mkdir -p apps/frontend/src/components/dashboard/recent-matches/__tests__
mv apps/frontend/src/components/__tests__/recent-matches.test.tsx apps/frontend/src/components/dashboard/recent-matches/__tests__/recent-matches.test.tsx
```
Update the import inside the test to `import { RecentMatches } from "../recent-matches";`

- [ ] **Step 6: Update import in `page.tsx`**
```tsx
import { RecentMatches } from "@/components/dashboard/recent-matches/recent-matches";
```

- [ ] **Step 7: Run lint + tests**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 8: Commit**
```bash
git add apps/frontend/src/components/dashboard/ apps/frontend/src/components/__tests__/ apps/frontend/src/components/recent-matches.tsx apps/frontend/src/app/
git commit -m "refactor: split recent-matches into MatchRow, MatchSkeleton + move to dashboard/"
```

---

### Task 7: Split `sidebar.tsx` into layout module

**Files:**
- Create: `apps/frontend/src/components/layout/sidebar/nav-config.ts`
- Create: `apps/frontend/src/components/layout/sidebar/nav-link.tsx`
- Create: `apps/frontend/src/components/layout/sidebar/sidebar-logo.tsx`
- Create: `apps/frontend/src/components/layout/sidebar/sidebar-user-section.tsx`
- Create: `apps/frontend/src/components/layout/sidebar/sidebar.tsx`
- Delete: `apps/frontend/src/components/sidebar.tsx`
- Move: `apps/frontend/src/components/theme-toggle.tsx` → `apps/frontend/src/components/layout/theme-toggle.tsx`
- Modify: `apps/frontend/src/app/(protected)/layout.tsx` (update import)

- [ ] **Step 1: Create `layout/sidebar/nav-config.ts`** — `navItems`, `bottomItems`, `rankColors` data arrays (no React, pure data)

- [ ] **Step 2: Create `layout/sidebar/nav-link.tsx`** — `NavLink` component (lines 90–146 of original)

- [ ] **Step 3: Create `layout/sidebar/sidebar-logo.tsx`** — Logo section (lines 201–219)

- [ ] **Step 4: Create `layout/sidebar/sidebar-user-section.tsx`** — User avatar + rank + online status (lines 246–273). Props: `{ userName, userImage, rankColor, rankLabel, isCollapsed }`

- [ ] **Step 5: Create orchestrator `layout/sidebar/sidebar.tsx`** — imports NavLink, SidebarLogo, SidebarUserSection, nav-config. Handles mobile overlay/toggle + collapse.

- [ ] **Step 6: Move `theme-toggle.tsx` to `layout/`**
```bash
mkdir -p apps/frontend/src/components/layout
mv apps/frontend/src/components/theme-toggle.tsx apps/frontend/src/components/layout/theme-toggle.tsx
```

- [ ] **Step 7: Delete original `components/sidebar.tsx`**

- [ ] **Step 8: Update imports**
  - `app/(protected)/layout.tsx`: `import { Sidebar } from "@/components/layout/sidebar/sidebar";`
  - Any file importing `theme-toggle`: update path

- [ ] **Step 9: Run lint + tests**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 10: Commit**
```bash
git add apps/frontend/src/components/layout/ apps/frontend/src/components/sidebar.tsx apps/frontend/src/components/theme-toggle.tsx apps/frontend/src/app/
git commit -m "refactor: split sidebar into NavLink, SidebarLogo, SidebarUserSection + move to layout/"
```

---

## Chunk 3: Move remaining loose components + page extraction

### Task 8: Move dashboard widgets to `components/dashboard/`

**Files:**
- Move: `apps/frontend/src/components/online-players.tsx` → `apps/frontend/src/components/dashboard/online-players.tsx`
- Move: `apps/frontend/src/components/quick-stats.tsx` → `apps/frontend/src/components/dashboard/quick-stats.tsx`
- Modify: `apps/frontend/src/app/(protected)/page.tsx` (update imports)

- [ ] **Step 1: Move files**
```bash
mv apps/frontend/src/components/online-players.tsx apps/frontend/src/components/dashboard/online-players.tsx
mv apps/frontend/src/components/quick-stats.tsx apps/frontend/src/components/dashboard/quick-stats.tsx
```

- [ ] **Step 2: Update imports in `page.tsx`**
```tsx
import { OnlinePlayers } from "@/components/dashboard/online-players";
import { QuickStats } from "@/components/dashboard/quick-stats";
```

- [ ] **Step 3: Run lint + tests**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 4: Commit**
```bash
git add apps/frontend/src/components/dashboard/ apps/frontend/src/components/online-players.tsx apps/frontend/src/components/quick-stats.tsx apps/frontend/src/app/
git commit -m "refactor: move online-players and quick-stats to dashboard/"
```

---

### Task 9: Extract `MultiplayerPlayingView` from `multiplayer/page.tsx`

**Files:**
- Create: `apps/frontend/src/components/multiplayer/multiplayer-playing-view.tsx`
- Modify: `apps/frontend/src/app/(protected)/multiplayer/page.tsx`

The playing state block (lines 48–76 of page.tsx) mixes game stats bar, typing area, and prompt text. Extract into its own component.

- [ ] **Step 1: Create `multiplayer/multiplayer-playing-view.tsx`**
```tsx
"use client";

import { ComboDisplay } from "@/components/typing/combo-display";
import { TypingArea } from "@/components/typing/typing-area";
import { OpponentProgress } from "./opponent-progress";

interface MultiplayerPlayingViewProps {
	timeRemaining: number;
	gameDuration: number;
	isRunning: boolean;
	wpm: number;
	accuracy: number;
	score: number;
}

export function MultiplayerPlayingView({
	timeRemaining,
	gameDuration,
	isRunning,
	wpm,
	accuracy,
	score,
}: MultiplayerPlayingViewProps) {
	return (
		<div className="w-full space-y-6">
			<OpponentProgress />
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-6 font-mono text-2xl text-muted-foreground">
					<span className="tabular-nums text-primary">
						{isRunning ? timeRemaining : gameDuration}
					</span>
					{isRunning && (
						<>
							<span className="tabular-nums">{wpm} wpm</span>
							<span className="tabular-nums">{accuracy}%</span>
							<span className="tabular-nums">{score}</span>
						</>
					)}
				</div>
			</div>
			<div className="relative">
				<ComboDisplay />
				<TypingArea />
			</div>
			{!isRunning && (
				<p className="text-center text-sm text-muted-foreground">
					Start typing to begin...
				</p>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Update `multiplayer/page.tsx`** — replace inline playing block with:
```tsx
import { MultiplayerPlayingView } from "@/components/multiplayer/multiplayer-playing-view";

// In the render:
{mp.status === "playing" && (
	<MultiplayerPlayingView
		timeRemaining={typingStore.timeRemaining}
		gameDuration={mp.gameDuration}
		isRunning={typingStore.isRunning}
		wpm={typingStore.wpm}
		accuracy={typingStore.accuracy}
		score={typingStore.score}
	/>
)}
```

- [ ] **Step 3: Run lint + tests**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 4: Commit**
```bash
git add apps/frontend/src/components/multiplayer/multiplayer-playing-view.tsx apps/frontend/src/app/
git commit -m "refactor: extract MultiplayerPlayingView from multiplayer page"
```

---

### Task 10: Final cleanup — remove empty `__tests__/` dir, verify no broken imports

- [ ] **Step 1: Check if `components/__tests__/` is empty**
```bash
ls apps/frontend/src/components/__tests__/
```
If empty, delete it.

- [ ] **Step 2: Full grep for any old import paths that might be broken**
```bash
cd apps/frontend && grep -r "from.*@/components/play-section\"" src/ --include="*.tsx" --include="*.ts"
cd apps/frontend && grep -r "from.*@/components/recent-matches\"" src/ --include="*.tsx" --include="*.ts"
cd apps/frontend && grep -r "from.*@/components/sidebar\"" src/ --include="*.tsx" --include="*.ts"
cd apps/frontend && grep -r "from.*@/components/game-toast\"" src/ --include="*.tsx" --include="*.ts"
cd apps/frontend && grep -r "from.*@/components/rank-badge\"" src/ --include="*.tsx" --include="*.ts"
cd apps/frontend && grep -r "from.*@/components/online-players\"" src/ --include="*.tsx" --include="*.ts"
cd apps/frontend && grep -r "from.*@/components/quick-stats\"" src/ --include="*.tsx" --include="*.ts"
cd apps/frontend && grep -r "from.*@/components/theme-toggle\"" src/ --include="*.tsx" --include="*.ts"
```
Fix any remaining old paths.

- [ ] **Step 3: Run full lint + test suite**
```bash
cd apps/frontend && bunx biome check . && bunx vitest run
```

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "refactor: cleanup old paths and empty dirs after SRP refactor"
```
