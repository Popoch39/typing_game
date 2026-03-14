# CLAUDE.md — apps/frontend

Next.js frontend for the typing game.

## Stack

- Next.js 16 (App Router) + React 19 + React Compiler enabled
- Tailwind CSS v4
- UI: shadcn/ui (Base UI) — components in `src/components/ui/`
- State: Zustand (stores), TanStack Query (server state)
- Animations: GSAP
- Forms: React Hook Form + Zod
- Auth: Better Auth client (`better-auth/react`)
- Tests: Vitest + Testing Library (jsdom)
- Linting: Biome (tabs, double quotes)

## Structure

```
src/
  app/
    layout.tsx              # Root layout (fonts, providers)
    globals.css             # Tailwind + custom CSS vars
    (auth)/                 # Login/register pages (public)
    (protected)/            # Protected pages (home, multiplayer)
  components/
    ui/                     # shadcn/ui components (button, card, input, label)
    typing/                 # Game components (typing-area, combo-display, stats, result)
    multiplayer/            # Multiplayer components (lobby, countdown, result, opponent)
  hooks/
    use-auth.ts             # Auth hook (login, register, logout, session)
    use-game-scores.ts      # TanStack Query hook for scores
    use-multiplayer.ts      # WebSocket connection hook
    use-multiplayer-game.ts # Multiplayer game logic hook
  stores/
    use-typing-store.ts     # Zustand store — typing game state
    use-multiplayer-store.ts # Zustand store — multiplayer state (phase, room, opponent)
  lib/
    auth-client.ts          # Better Auth client (createAuthClient)
    multiplayer-client.ts   # MultiplayerClient class — WebSocket wrapper
    typing-engine.ts        # TypingEngine — local typing logic (keystrokes, WPM, accuracy)
    query-client.ts         # TanStack Query client
    word-lists.ts           # Client-side word lists
    utils.ts                # cn() (clsx + tailwind-merge)
  providers/
    query-provider.tsx      # QueryClientProvider wrapper
    theme-provider.tsx      # next-themes ThemeProvider
  validators/
    auth.ts                 # Zod schemas for login/register
  types/
    auth.ts                 # Auth types
  proxy.ts                  # Next.js middleware (auth redirects) — NOT middleware.ts
  test/
    setup.ts                # Vitest setup (@testing-library/jest-dom)
    test-utils.tsx          # Custom render with providers
```

## Commands

```bash
next dev                                    # Dev server
bunx vitest run                             # Run all tests
bunx vitest run path/to/test                # Single test
bunx vitest run --coverage                  # Tests + coverage
biome check .                               # Lint
biome check --fix .                         # Lint + fix
biome format --fix .                        # Format
```

## After Every Change

Run the `react-doctor` skill to catch React issues early (https://github.com/millionco/react-doctor).

## Conventions

- Path alias `@/` → `src/`.
- Middleware lives in `src/proxy.ts` (not `middleware.ts`). Handles auth redirects.
- API calls go through the Next.js rewrites proxy (`/api/*` → API service). No direct cross-origin calls.
- WS connection uses the session token as a query param: `ws://host:3002/ws?token=...`.
- WS protocol types come from `@repo/shared/ws-protocol` — do not duplicate.
- Scoring engine comes from `@repo/shared/scoring-engine` — shared logic with the WS server.
- Biome config: tabs for indentation, double quotes.
- Vitest config: `@repo/shared/*` aliases are manually resolved in `vitest.config.ts`.
- Tests colocated in `__tests__/` directories next to source files.
- shadcn/ui components in `src/components/ui/` — use `cn()` from `lib/utils.ts` for class merging.

## Env vars

- `API_INTERNAL_URL` — Internal API URL (http://api:3001 in Docker, http://localhost:3001 locally)
- `NEXT_PUBLIC_WS_URL` — Public WebSocket URL (ws://localhost:3002)
