# CLAUDE.md — apps/ws

WebSocket server for real-time multiplayer. Built with **Elysia** (Bun).

## Stack

- Runtime: Bun
- Framework: Elysia (native WebSocket)
- Auth: direct session validation via DB query (not Better Auth — manual sessions+users query)
- DB: Drizzle (PostgreSQL) via `@repo/database`
- Shared types: `@repo/shared` (ws-protocol, scoring-engine)
- Linting: Biome

## Structure

```
src/
  index.ts           # Entry point — Elysia WS server + debug dashboard HTML
  auth.ts            # validateSession(token) — queries sessions/users tables
  matchmaking.ts     # Matchmaking class — per-duration queues, private rooms (code), pairing
  game-room.ts       # GameRoom class — lifecycle (waiting→countdown→playing→finished)
  typing-tracker.ts  # TypingTracker — per-player real-time WPM/accuracy/score computation
  word-list.ts       # Word list generation
  logger.ts          # Custom logger with colored prefixes
  types.ts           # Player interface + re-export of @repo/shared types
  bench/
    stress.ts        # WS stress test
  __tests__/         # Colocated tests
```

## Commands

```bash
bun --watch src/index.ts    # Dev (hot reload)
bun test                    # Run all tests
bun test path/to/test       # Single test
bun run src/bench/stress.ts --keystrokes 100000  # Stress test
biome check .               # Lint
biome format --fix .        # Format
```

## Key Architecture

### Matchmaking flow
1. Client sends `join_queue` (with duration) or `create_room`/`join_room` (private with 6-char code)
2. Queue: when 2 players in the same duration → `createMatch` → `GameRoom`
3. Private room: creator gets a code, second player joins with that code

### GameRoom lifecycle
`waiting` → `countdown` (3-2-1) → `playing` → `finished`
- Countdown starts when 2 players are in the room
- During `playing`: keystrokes processed by `TypingTracker`, stats sent in real-time
- Auto-destroy after game ends

### Messages
- Client→Server: defined in `@repo/shared/ws-protocol` (`ClientMessage`)
- Server→Client: defined in `@repo/shared/ws-protocol` (`ServerMessage`)
- **When modifying the WS protocol, update `packages/shared/src/ws-protocol.ts`** — it's the shared source of truth between WS and frontend.

## Conventions

- WS auth differs from the API: the session token is passed as a query param (`?token=...`), not via headers.
- The `Player` interface wraps the raw ws with `send`/`close` to decouple from the Elysia framework.
- Debug HTML dashboard available at `/dashboard` (auto-refresh 3s).
- Rooms are automatically cleaned up after the game ends.

## Env vars

- `DATABASE_URL` — Postgres connection string
- `PORT` — Server port (default 3002)
