# CLAUDE.md — apps/api

REST API for the typing game. Built with **Elysia** (Bun) + **Better Auth** + **Drizzle ORM**.

## Stack

- Runtime: Bun
- Framework: Elysia
- Auth: Better Auth (email/password, mounted directly on Elysia via `.mount(auth.handler)`)
- ORM: Drizzle (PostgreSQL)
- Linting: Biome

## Structure

```
src/
  index.ts          # Entry point — Elysia app, CORS, mount auth + routes
  db/
    index.ts        # Export db (via @repo/database createDb)
    schema.ts       # Re-export of @repo/database schema
    migrate.ts      # Migration script
  lib/
    auth.ts         # Better Auth config (drizzle adapter, email/password)
  routes/
    game.ts         # Routes /api/game/* (scores, leaderboard)
  test/
    setup.ts        # Preload: set env vars + run migrations on typing_game_test
    helpers.ts      # Test helpers
  __tests__/        # Colocated tests
```

## Commands

```bash
bun --watch src/index.ts                             # Dev (hot reload)
bun test --preload ./src/test/setup.ts               # Run all tests
bun test --preload ./src/test/setup.ts path/to/test  # Single test
bun run db:generate                                  # Generate migration
bun run db:migrate                                   # Run migrations
bun run db:studio                                    # Drizzle Studio
biome check .                                        # Lint
biome format --fix .                                 # Format
```

## Conventions

- API routes are prefixed `/api/game/*` — the frontend proxies `/api/*` to this service.
- Auth: protected routes get the session via `auth.api.getSession({ headers: request.headers })`.
- DB schema lives in `packages/database`, re-exported locally in `src/db/schema.ts`.
- Tests run against a separate `typing_game_test` database (port 5433). The setup preload creates/migrates it.
- Request body validation uses Elysia types (`t.Object`, `t.Number`, etc.).

## Env vars

- `DATABASE_URL` — Postgres connection string
- `BETTER_AUTH_SECRET` — Better Auth secret
- `BETTER_AUTH_URL` — API service URL (http://localhost:3001)
- `FRONTEND_URL` — Frontend URL for CORS (http://localhost:3000)
- `PORT` — Server port (default 3001)
