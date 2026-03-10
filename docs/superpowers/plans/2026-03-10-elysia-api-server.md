# Elysia API Server Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Elysia.js REST API server with Better Auth + Drizzle/Postgres to the Turborepo, fully containerised with Docker Compose.

**Architecture:** New `apps/api` Elysia app alongside existing `apps/frontend`. Docker Compose at root orchestrates frontend, api, and postgres. Better Auth handles auth routes, custom routes for game scores/leaderboard.

**Tech Stack:** Elysia.js, Drizzle ORM, Better Auth, PostgreSQL 17, Docker, Bun

---

## Chunk 1: Project scaffolding & Docker

### Task 1: Scaffold `apps/api` package

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "start": "bun dist/index.js",
    "lint": "biome check .",
    "format": "biome format --fix .",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun src/db/migrate.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "elysia": "^1.3",
    "@elysiajs/cors": "^1.3",
    "better-auth": "^1.3",
    "drizzle-orm": "^0.44",
    "postgres": "^3.4"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.6",
    "@repo/typescript-config": "*",
    "@types/bun": "latest",
    "drizzle-kit": "^0.31",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create minimal `apps/api/src/index.ts`**

```typescript
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

const app = new Elysia()
  .use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .get("/health", () => ({ status: "ok" }))
  .listen(Number(process.env.PORT) || 3001);

console.log(`API running at ${app.server?.hostname}:${app.server?.port}`);
```

- [ ] **Step 4: Install dependencies**

Run: `cd apps/api && bun install`

- [ ] **Step 5: Verify server starts**

Run: `cd apps/api && bun run dev`
Expected: "API running at localhost:3001"

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/src/index.ts
git commit -m "feat(api): scaffold Elysia server with CORS and health endpoint"
```

---

### Task 2: Update Turbo config for API

**Files:**
- Modify: `turbo.json`

- [ ] **Step 1: Add `dist/**` to build outputs in `turbo.json`**

In `turbo.json`, update the `build` task outputs to include Elysia's dist:

```json
{
  "build": {
    "dependsOn": ["^build"],
    "inputs": ["$TURBO_DEFAULT$", ".env*"],
    "outputs": [".next/**", "!.next/cache/**", "dist/**"]
  }
}
```

- [ ] **Step 2: Verify turbo sees the api app**

Run: `turbo run build --dry`
Expected: `api` appears in the task list

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "chore(turbo): add dist output for api builds"
```

---

### Task 3: Docker setup

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/frontend/Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Create `apps/api/Dockerfile`**

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["bun", "--watch", "src/index.ts"]
```

- [ ] **Step 2: Create `apps/frontend/Dockerfile`**

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["bun", "run", "dev"]
```

- [ ] **Step 3: Create `.env.example`**

```env
DATABASE_URL=postgres://postgres:postgres@postgres:5432/typing_game
BETTER_AUTH_SECRET=change-me-to-a-random-secret
BETTER_AUTH_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

- [ ] **Step 4: Create `docker-compose.yml` at repo root**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: typing_game
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/typing_game
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:-dev-secret-change-me}
      BETTER_AUTH_URL: http://localhost:3001
      FRONTEND_URL: http://localhost:3000
      PORT: 3001
    volumes:
      - ./apps/api/src:/app/src
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    volumes:
      - ./apps/frontend/src:/app/src
    depends_on:
      - api

volumes:
  pgdata:
```

- [ ] **Step 5: Verify compose starts**

Run: `docker compose up --build`
Expected: All 3 services start, API health check at `http://localhost:3001/health` returns `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git add apps/api/Dockerfile apps/frontend/Dockerfile docker-compose.yml .env.example
git commit -m "feat(docker): add Docker Compose with postgres, api, and frontend"
```

---

## Chunk 2: Database & Auth

### Task 4: Drizzle schema & connection

**Files:**
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/index.ts`
- Create: `apps/api/src/db/migrate.ts`
- Create: `apps/api/drizzle.config.ts`

- [ ] **Step 1: Create `apps/api/drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Create `apps/api/src/db/schema.ts`**

```typescript
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  real,
} from "drizzle-orm/pg-core";

// ── Better Auth tables ──

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Game tables ──

export const gameScores = pgTable("game_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  wpm: integer("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  duration: integer("duration").notNull(),
  mode: text("mode").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

- [ ] **Step 3: Create `apps/api/src/db/index.ts`**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

- [ ] **Step 4: Create `apps/api/src/db/migrate.ts`**

```typescript
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./drizzle" });
await client.end();

console.log("Migrations complete");
```

- [ ] **Step 5: Generate initial migration**

Run: `cd apps/api && DATABASE_URL=postgres://postgres:postgres@localhost:5432/typing_game bun run db:generate`
Expected: Migration files created in `apps/api/drizzle/`

- [ ] **Step 6: Run migration against Docker postgres**

Run: `cd apps/api && DATABASE_URL=postgres://postgres:postgres@localhost:5432/typing_game bun run db:migrate`
Expected: "Migrations complete"

- [ ] **Step 7: Commit**

```bash
git add apps/api/drizzle.config.ts apps/api/src/db/ apps/api/drizzle/
git commit -m "feat(api): add Drizzle schema and migrations for auth + game_scores"
```

---

### Task 5: Better Auth configuration

**Files:**
- Create: `apps/api/src/lib/auth.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create `apps/api/src/lib/auth.ts`**

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    // Uncomment and configure as needed:
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // },
    // github: {
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    // },
  },
  trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:3000"],
});
```

- [ ] **Step 2: Mount Better Auth in `apps/api/src/index.ts`**

Replace `apps/api/src/index.ts` with:

```typescript
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./lib/auth";

const app = new Elysia()
  .use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .mount(auth.handler)
  .get("/health", () => ({ status: "ok" }))
  .listen(Number(process.env.PORT) || 3001);

console.log(`API running at ${app.server?.hostname}:${app.server?.port}`);
```

- [ ] **Step 3: Verify auth endpoints exist**

Run: `curl -s http://localhost:3001/api/auth/ok`
Expected: Returns a response (Better Auth health check)

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/auth.ts apps/api/src/index.ts
git commit -m "feat(api): integrate Better Auth with Drizzle adapter"
```

---

## Chunk 3: Game routes

### Task 6: Game routes (scores & leaderboard)

**Files:**
- Create: `apps/api/src/routes/game.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create `apps/api/src/routes/game.ts`**

```typescript
import { Elysia, t } from "elysia";
import { db } from "../db";
import { gameScores } from "../db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "../lib/auth";

export const gameRoutes = new Elysia({ prefix: "/api/game" })
  .post(
    "/scores",
    async ({ body, request }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      if (!session) {
        return new Response("Unauthorized", { status: 401 });
      }

      const score = await db
        .insert(gameScores)
        .values({
          userId: session.user.id,
          wpm: body.wpm,
          accuracy: body.accuracy,
          duration: body.duration,
          mode: body.mode,
        })
        .returning();

      return score[0];
    },
    {
      body: t.Object({
        wpm: t.Number(),
        accuracy: t.Number(),
        duration: t.Number(),
        mode: t.String(),
      }),
    }
  )
  .get("/scores", async ({ query, request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const limit = Number(query.limit) || 20;
    const offset = Number(query.offset) || 0;

    const scores = await db
      .select()
      .from(gameScores)
      .where(eq(gameScores.userId, session.user.id))
      .orderBy(desc(gameScores.createdAt))
      .limit(limit)
      .offset(offset);

    return scores;
  })
  .get("/leaderboard", async ({ query }) => {
    const limit = Number(query.limit) || 20;
    const offset = Number(query.offset) || 0;
    const mode = query.mode;

    const conditions = mode ? eq(gameScores.mode, mode) : undefined;

    const scores = await db
      .select({
        id: gameScores.id,
        wpm: gameScores.wpm,
        accuracy: gameScores.accuracy,
        duration: gameScores.duration,
        mode: gameScores.mode,
        createdAt: gameScores.createdAt,
        userName: sql<string>`(SELECT name FROM users WHERE id = ${gameScores.userId})`,
      })
      .from(gameScores)
      .where(conditions)
      .orderBy(desc(gameScores.wpm))
      .limit(limit)
      .offset(offset);

    return scores;
  });
```

- [ ] **Step 2: Wire game routes into `apps/api/src/index.ts`**

```typescript
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./lib/auth";
import { gameRoutes } from "./routes/game";

const app = new Elysia()
  .use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .mount(auth.handler)
  .use(gameRoutes)
  .get("/health", () => ({ status: "ok" }))
  .listen(Number(process.env.PORT) || 3001);

console.log(`API running at ${app.server?.hostname}:${app.server?.port}`);
```

- [ ] **Step 3: Verify leaderboard route responds**

Run: `curl -s http://localhost:3001/api/game/leaderboard`
Expected: Returns `[]` (empty array, no scores yet)

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/game.ts apps/api/src/index.ts
git commit -m "feat(api): add game routes for scores and leaderboard"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full docker compose up**

Run: `docker compose up --build`
Expected: All 3 services running

- [ ] **Step 2: Test health endpoint**

Run: `curl http://localhost:3001/health`
Expected: `{"status":"ok"}`

- [ ] **Step 3: Test auth signup**

Run: `curl -X POST http://localhost:3001/api/auth/sign-up/email -H "Content-Type: application/json" -d '{"name":"test","email":"test@test.com","password":"password123"}'`
Expected: Returns user object with token

- [ ] **Step 4: Test leaderboard**

Run: `curl http://localhost:3001/api/game/leaderboard`
Expected: Returns `[]`

- [ ] **Step 5: Final commit if any fixes needed**
