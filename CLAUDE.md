# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multiplayer typing game — real-time 1v1 typing races with matchmaking (queue or private rooms), WPM/accuracy tracking, and a scoring engine.

## Architecture

Turborepo monorepo using **Bun** as runtime and package manager.

### Apps

- **`apps/api`** (port 3001) — REST API built with **Elysia** (Bun HTTP framework). Handles auth (Better Auth with email/password) and game score persistence. Mounts Better Auth handler directly on Elysia.
- **`apps/ws`** (port 3002) — WebSocket server built with **Elysia**. Manages matchmaking (queue-based and private rooms), game rooms, real-time keystroke processing, and typing stats computation. Has an HTML dashboard at `/dashboard`.
- **`apps/frontend`** (port 3000) — **Next.js 16** with React 19, React Compiler enabled. Uses Tailwind CSS v4, shadcn/ui (via Base UI), Zustand for state, TanStack Query for server state, GSAP for animations. API calls proxied via Next.js rewrites to the API service.

### Packages

- **`packages/database`** — Drizzle ORM schema (PostgreSQL). Tables: users, sessions, accounts, verifications (Better Auth), gameScores.
- **`packages/shared`** — WebSocket protocol types (`ClientMessage`/`ServerMessage`) and scoring engine. Shared between `ws` and `frontend`.
- **`packages/ui`** — Shared React component library (button, card, code).
- **`packages/typescript-config`** — Shared tsconfig presets.

### Key Data Flow

Frontend connects to WS server with a session token → WS validates session via the API's Better Auth → matchmaking pairs players → game room sends word list and manages countdown → keystrokes streamed from clients → server computes WPM/accuracy/score in real-time → results persisted to DB.

## Commands

### Development (local — recommended)

Postgres runs in Docker, apps run on the host with hot-reload via Bun/turbo.

```bash
bun install      # Install dependencies
make dev         # Start Postgres (Docker) + all apps (local)
make dev-stop    # Stop Postgres
make studio      # Open Drizzle Studio (DB browser)
```

### Full Docker stack

All services containerized (for future deployment).

```bash
make up          # Start all services (postgres, api, ws, frontend)
make down        # Stop all services
make clean       # Stop and remove all volumes (dev + full stack)
make logs        # All logs; make logs-api, make logs-frontend, etc.
```

### Database

```bash
make migrate     # Run migrations
make generate    # Generate migration from schema changes
make db-push     # Push schema directly (no migration file)
```

### Testing

```bash
make test            # Run all tests (api + frontend + ws)
make test-api        # API tests only (bun test with setup preload)
make test-frontend   # Frontend tests only (vitest)
make test-ws         # WS tests only (bun test)
make bench-ws        # WS stress test
```

Single test: `cd apps/frontend && bunx vitest run path/to/test` or `cd apps/api && bun test --preload ./src/test/setup.ts path/to/test`.

### Linting & Formatting

All apps use **Biome** (not ESLint/Prettier):
```bash
bun run lint     # Check all (turbo)
bun run format   # Format all (turbo)
```

## Important

- When modifying code in an app, read its `CLAUDE.md` first (`apps/api/CLAUDE.md`, `apps/ws/CLAUDE.md`, `apps/frontend/CLAUDE.md`) for app-specific conventions.
- After every change, run the lint for the affected app and fix any errors.
- For every new feature, write tests. After every change, run the tests for the affected app and fix any failures.

## Conventions

- **Biome** for linting/formatting across all apps.
- Frontend uses `@/` path alias mapping to `src/`.
- Frontend middleware is in `src/proxy.ts` (not `middleware.ts`) — handles auth redirects.
- WS protocol types are defined in `packages/shared/src/ws-protocol.ts` — update both client and server when changing the protocol.
- API proxying: frontend Next.js rewrites `/api/*` to the API service; no direct cross-origin calls from the browser.
- Tests colocated in `__tests__/` directories next to source files.
- Docker Compose exposes Postgres on host port **5433** (not 5432).
