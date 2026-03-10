# Elysia API Server — Design Spec

## Context

Turborepo monorepo (Bun) with Next.js 16 frontend. Need a REST API server for game logic and authentication. A separate WebSocket server will be added later.

## Stack

- **Elysia.js** — HTTP framework
- **Drizzle ORM** + drizzle-kit — DB access & migrations
- **Better Auth** — Auth (email/password + OAuth providers)
- **PostgreSQL 17** — Database
- **Docker Compose** — Full containerisation (frontend + api + postgres)

## Architecture — Approach A (Single Compose)

One `docker-compose.yml` at repo root. One `Dockerfile` per app. Dev uses bind mounts for hot-reload.

### Services

| Service    | Image/Build       | Port | Depends on |
|------------|-------------------|------|------------|
| `postgres` | postgres:17-alpine| 5432 | —          |
| `api`      | apps/api          | 3001 | postgres   |
| `frontend` | apps/frontend     | 3000 | api        |

Single Docker network `app-network`. Services communicate by name.

## Server Structure

```
apps/api/
  src/
    index.ts              # Elysia entry point
    routes/
      auth.ts             # Better Auth routes
      game.ts             # Game routes (scores, leaderboard)
    db/
      index.ts            # Drizzle connection
      schema.ts           # Drizzle schema
      migrate.ts          # Migration script
    lib/
      auth.ts             # Better Auth config
  drizzle.config.ts
  package.json
  tsconfig.json
  Dockerfile
```

## Database Schema

### users
- id (uuid, PK)
- name (text)
- email (text, unique)
- emailVerified (boolean)
- image (text, nullable)
- createdAt, updatedAt (timestamp)

### sessions (Better Auth)
- id (uuid, PK)
- userId (FK → users)
- token (text, unique)
- expiresAt, createdAt (timestamp)

### accounts (Better Auth — OAuth)
- id (uuid, PK)
- userId (FK → users)
- provider (text)
- providerAccountId (text)
- OAuth tokens

### game_scores
- id (uuid, PK)
- userId (FK → users)
- wpm (integer)
- accuracy (real)
- duration (integer, seconds)
- mode (text)
- createdAt (timestamp)

## API Routes

### Auth (managed by Better Auth)
- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-in/{provider}`
- `POST /api/auth/sign-out`
- `GET  /api/auth/session`

### Game
- `POST /api/game/scores` — Save score (auth required)
- `GET  /api/game/scores` — My scores (auth required, paginated)
- `GET  /api/game/leaderboard` — Top scores (public, filterable by mode)

## Docker Dev Setup
- Bind mounts for hot-reload
- `bun --watch` for API
- `.env` at repo root for env vars
- Postgres volume for data persistence
- Healthcheck on postgres before api starts
