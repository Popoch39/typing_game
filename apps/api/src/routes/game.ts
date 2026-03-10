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
