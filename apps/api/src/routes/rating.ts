import {
	computeGlicko2,
	DEFAULT_RATING,
	DEFAULT_RD,
	DEFAULT_VOLATILITY,
	decayRD,
	type GlickoPlayer,
} from "@repo/shared/glicko2";
import { desc, eq, or, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { matchResults, playerRatings, users } from "../db/schema";
import { auth } from "../lib/auth";
import { redis } from "../lib/redis";

export const ratingRoutes = new Elysia({ prefix: "/api/rating" })
	.get("/leaderboard", async () => {
		const rows = await db
			.select({
				userId: playerRatings.userId,
				name: users.name,
				rating: playerRatings.rating,
				gamesPlayed: playerRatings.gamesPlayed,
			})
			.from(playerRatings)
			.innerJoin(users, eq(users.id, playerRatings.userId))
			.where(sql`${playerRatings.gamesPlayed} >= 1`)
			.orderBy(desc(playerRatings.rating))
			.limit(50);

		return rows;
	})
	.get("/match-history/me", async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers,
		});
		if (!session) {
			return new Response("Unauthorized", { status: 401 });
		}

		const userId = session.user.id;

		const matches = await db
			.select({
				id: matchResults.id,
				roomId: matchResults.roomId,
				player1Id: matchResults.player1Id,
				player2Id: matchResults.player2Id,
				winnerId: matchResults.winnerId,
				player1Score: matchResults.player1Score,
				player2Score: matchResults.player2Score,
				player1Wpm: matchResults.player1Wpm,
				player2Wpm: matchResults.player2Wpm,
				player1Accuracy: matchResults.player1Accuracy,
				player2Accuracy: matchResults.player2Accuracy,
				player1RatingBefore: matchResults.player1RatingBefore,
				player1RatingAfter: matchResults.player1RatingAfter,
				player2RatingBefore: matchResults.player2RatingBefore,
				player2RatingAfter: matchResults.player2RatingAfter,
				mode: matchResults.mode,
				duration: matchResults.duration,
				createdAt: matchResults.createdAt,
				player1Name: sql<string>`(SELECT name FROM users WHERE id = ${matchResults.player1Id})`,
				player2Name: sql<string>`(SELECT name FROM users WHERE id = ${matchResults.player2Id})`,
			})
			.from(matchResults)
			.where(
				or(
					eq(matchResults.player1Id, userId),
					eq(matchResults.player2Id, userId),
				),
			)
			.orderBy(desc(matchResults.createdAt))
			.limit(20);

		return matches;
	})
	.get("/match-history/:userId", async ({ params }) => {
		const { userId } = params;

		const matches = await db
			.select({
				id: matchResults.id,
				roomId: matchResults.roomId,
				player1Id: matchResults.player1Id,
				player2Id: matchResults.player2Id,
				winnerId: matchResults.winnerId,
				player1Score: matchResults.player1Score,
				player2Score: matchResults.player2Score,
				player1Wpm: matchResults.player1Wpm,
				player2Wpm: matchResults.player2Wpm,
				player1Accuracy: matchResults.player1Accuracy,
				player2Accuracy: matchResults.player2Accuracy,
				player1RatingBefore: matchResults.player1RatingBefore,
				player1RatingAfter: matchResults.player1RatingAfter,
				player2RatingBefore: matchResults.player2RatingBefore,
				player2RatingAfter: matchResults.player2RatingAfter,
				mode: matchResults.mode,
				duration: matchResults.duration,
				createdAt: matchResults.createdAt,
				player1Name: sql<string>`(SELECT name FROM users WHERE id = ${matchResults.player1Id})`,
				player2Name: sql<string>`(SELECT name FROM users WHERE id = ${matchResults.player2Id})`,
			})
			.from(matchResults)
			.where(
				or(
					eq(matchResults.player1Id, userId),
					eq(matchResults.player2Id, userId),
				),
			)
			.orderBy(desc(matchResults.createdAt))
			.limit(20);

		return matches;
	})
	.get("/:userId", async ({ params }) => {
		const { userId } = params;

		const rows = await db
			.select()
			.from(playerRatings)
			.where(eq(playerRatings.userId, userId));

		if (rows.length === 0) {
			return {
				userId,
				rating: DEFAULT_RATING,
				rd: DEFAULT_RD,
				gamesPlayed: 0,
			};
		}

		const row = rows[0];
		return {
			userId: row.userId,
			rating: row.rating,
			rd: row.rd,
			gamesPlayed: row.gamesPlayed,
		};
	})
	.get("/", async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers,
		});
		if (!session) {
			return new Response("Unauthorized", { status: 401 });
		}

		const userId = session.user.id;

		const rows = await db
			.insert(playerRatings)
			.values({
				userId,
				rating: DEFAULT_RATING,
				rd: DEFAULT_RD,
				volatility: DEFAULT_VOLATILITY,
				gamesPlayed: 0,
			})
			.onConflictDoNothing({ target: playerRatings.userId })
			.returning();

		if (rows.length > 0) {
			const row = rows[0];
			return {
				userId: row.userId,
				rating: row.rating,
				rd: row.rd,
				volatility: row.volatility,
				gamesPlayed: row.gamesPlayed,
			};
		}

		const existing = await db
			.select()
			.from(playerRatings)
			.where(eq(playerRatings.userId, userId));

		const row = existing[0];
		return {
			userId: row.userId,
			rating: row.rating,
			rd: row.rd,
			volatility: row.volatility,
			gamesPlayed: row.gamesPlayed,
		};
	})
	.post(
		"/internal/match-result",
		async ({ body, request }) => {
			const secret = request.headers.get("x-internal-secret");
			if (!secret || secret !== process.env.INTERNAL_SECRET) {
				return new Response("Unauthorized", { status: 401 });
			}

			const {
				roomId,
				player1Id,
				player2Id,
				winnerId,
				player1Score,
				player2Score,
				player1Wpm,
				player2Wpm,
				player1Accuracy,
				player2Accuracy,
				mode,
				duration,
			} = body;

			// Upsert playerRatings for both players
			await db
				.insert(playerRatings)
				.values([
					{
						userId: player1Id,
						rating: DEFAULT_RATING,
						rd: DEFAULT_RD,
						volatility: DEFAULT_VOLATILITY,
						gamesPlayed: 0,
					},
					{
						userId: player2Id,
						rating: DEFAULT_RATING,
						rd: DEFAULT_RD,
						volatility: DEFAULT_VOLATILITY,
						gamesPlayed: 0,
					},
				])
				.onConflictDoNothing({ target: playerRatings.userId });

			let player1RatingBefore: number | null = null;
			let player1RatingAfter: number | null = null;
			let player1RdBefore: number | null = null;
			let player1RdAfter: number | null = null;
			let player2RatingBefore: number | null = null;
			let player2RatingAfter: number | null = null;
			let player2RdBefore: number | null = null;
			let player2RdAfter: number | null = null;

			let ratingsResponse: {
				player1: { before: number; after: number } | null;
				player2: { before: number; after: number } | null;
			} = { player1: null, player2: null };

			if (mode === "ranked") {
				// Fetch current ratings
				const [p1Rows, p2Rows] = await Promise.all([
					db
						.select()
						.from(playerRatings)
						.where(eq(playerRatings.userId, player1Id)),
					db
						.select()
						.from(playerRatings)
						.where(eq(playerRatings.userId, player2Id)),
				]);

				const p1 = p1Rows[0];
				const p2 = p2Rows[0];

				player1RatingBefore = p1.rating;
				player1RdBefore = p1.rd;
				player2RatingBefore = p2.rating;
				player2RdBefore = p2.rd;

				// Apply RD decay based on lastGameAt
				let p1Rd = p1.rd;
				if (p1.lastGameAt) {
					const daysSince =
						(Date.now() - p1.lastGameAt.getTime()) / (1000 * 60 * 60 * 24);
					p1Rd = decayRD(
						{
							rating: p1.rating,
							rd: p1.rd,
							volatility: p1.volatility,
						},
						daysSince,
					);
				}

				let p2Rd = p2.rd;
				if (p2.lastGameAt) {
					const daysSince =
						(Date.now() - p2.lastGameAt.getTime()) / (1000 * 60 * 60 * 24);
					p2Rd = decayRD(
						{
							rating: p2.rating,
							rd: p2.rd,
							volatility: p2.volatility,
						},
						daysSince,
					);
				}

				// Determine scores
				let p1Score: number;
				let p2Score: number;
				if (winnerId === null) {
					p1Score = 0.5;
					p2Score = 0.5;
				} else if (winnerId === player1Id) {
					p1Score = 1.0;
					p2Score = 0.0;
				} else {
					p1Score = 0.0;
					p2Score = 1.0;
				}

				const p1Player: GlickoPlayer = {
					rating: p1.rating,
					rd: p1Rd,
					volatility: p1.volatility,
				};
				const p2Player: GlickoPlayer = {
					rating: p2.rating,
					rd: p2Rd,
					volatility: p2.volatility,
				};

				const p1Result = computeGlicko2(p1Player, p2Player, p1Score);
				const p2Result = computeGlicko2(p2Player, p1Player, p2Score);

				player1RatingAfter = p1Result.rating;
				player1RdAfter = p1Result.rd;
				player2RatingAfter = p2Result.rating;
				player2RdAfter = p2Result.rd;

				// Update playerRatings
				const now = new Date();
				await Promise.all([
					db
						.update(playerRatings)
						.set({
							rating: p1Result.rating,
							rd: p1Result.rd,
							volatility: p1Result.volatility,
							gamesPlayed: sql`${playerRatings.gamesPlayed} + 1`,
							lastGameAt: now,
							updatedAt: now,
						})
						.where(eq(playerRatings.userId, player1Id)),
					db
						.update(playerRatings)
						.set({
							rating: p2Result.rating,
							rd: p2Result.rd,
							volatility: p2Result.volatility,
							gamesPlayed: sql`${playerRatings.gamesPlayed} + 1`,
							lastGameAt: now,
							updatedAt: now,
						})
						.where(eq(playerRatings.userId, player2Id)),
				]);

				ratingsResponse = {
					player1: {
						before: p1.rating,
						after: p1Result.rating,
					},
					player2: {
						before: p2.rating,
						after: p2Result.rating,
					},
				};

				// Publish to Redis and update leaderboard
				try {
					await redis.publish(
						"elo:update",
						JSON.stringify({
							roomId,
							player1Id,
							player2Id,
							player1Rating: p1Result.rating,
							player2Rating: p2Result.rating,
						}),
					);
					await redis.zadd(
						"leaderboard",
						p1Result.rating,
						player1Id,
						p2Result.rating,
						player2Id,
					);
				} catch (_err) {
					// Redis is optional — don't fail the request
				}
			} else {
				// Casual mode: increment games played
				const now = new Date();
				await Promise.all([
					db
						.update(playerRatings)
						.set({
							gamesPlayed: sql`${playerRatings.gamesPlayed} + 1`,
							lastGameAt: now,
							updatedAt: now,
						})
						.where(eq(playerRatings.userId, player1Id)),
					db
						.update(playerRatings)
						.set({
							gamesPlayed: sql`${playerRatings.gamesPlayed} + 1`,
							lastGameAt: now,
							updatedAt: now,
						})
						.where(eq(playerRatings.userId, player2Id)),
				]);
			}

			// Insert match result (dedup via UNIQUE constraint on roomId)
			try {
				await db.insert(matchResults).values({
					roomId,
					player1Id,
					player2Id,
					winnerId,
					player1Score,
					player2Score,
					player1Wpm,
					player2Wpm,
					player1Accuracy,
					player2Accuracy,
					player1RatingBefore,
					player1RatingAfter,
					player1RdBefore,
					player1RdAfter,
					player2RatingBefore,
					player2RatingAfter,
					player2RdBefore,
					player2RdAfter,
					mode,
					duration,
				});
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				if (msg.includes("unique") || msg.includes("duplicate")) {
					return { success: true, duplicate: true, ratings: ratingsResponse };
				}
				throw err;
			}

			return { success: true, ratings: ratingsResponse };
		},
		{
			body: t.Object({
				roomId: t.String(),
				player1Id: t.String(),
				player2Id: t.String(),
				winnerId: t.Union([t.String(), t.Null()]),
				player1Score: t.Number(),
				player2Score: t.Number(),
				player1Wpm: t.Number(),
				player2Wpm: t.Number(),
				player1Accuracy: t.Number(),
				player2Accuracy: t.Number(),
				mode: t.Union([t.Literal("ranked"), t.Literal("casual")]),
				duration: t.Number(),
			}),
		},
	);
