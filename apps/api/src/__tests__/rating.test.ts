import { beforeEach, describe, expect, it } from "bun:test";
import {
	createTestApp,
	createTestUser,
	getAuthHeaders,
	truncateAll,
} from "../test/helpers";

const app = createTestApp();

beforeEach(async () => {
	await truncateAll();
});

// ── Helpers ──

function makeMatchBody(overrides: Record<string, unknown> = {}) {
	return {
		roomId: `room-${Date.now()}-${Math.random()}`,
		player1Id: "00000000-0000-0000-0000-000000000001",
		player2Id: "00000000-0000-0000-0000-000000000002",
		winnerId: null,
		player1Score: 100,
		player2Score: 90,
		player1Wpm: 60,
		player2Wpm: 55,
		player1Accuracy: 0.95,
		player2Accuracy: 0.92,
		mode: "casual" as const,
		duration: 30,
		...overrides,
	};
}

function internalHeaders(secret = "test-internal-secret") {
	return {
		"Content-Type": "application/json",
		"x-internal-secret": secret,
	};
}

// ── GET /api/rating ──

describe("GET /api/rating", () => {
	it("returns 401 when not authenticated", async () => {
		const res = await app.handle(
			new Request("http://localhost/api/rating"),
		);
		expect(res.status).toBe(401);
	});

	it("creates default rating for new user", async () => {
		const { headers } = await getAuthHeaders(app);
		const res = await app.handle(
			new Request("http://localhost/api/rating", { headers: headers }),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.rating).toBe(1500);
		expect(body.rd).toBe(350);
		expect(body.gamesPlayed).toBe(0);
		expect(body.userId).toBeDefined();
	});

	it("returns existing rating on subsequent calls", async () => {
		const { headers } = await getAuthHeaders(app);

		// First call creates
		await app.handle(
			new Request("http://localhost/api/rating", { headers: headers }),
		);

		// Second call returns existing
		const res = await app.handle(
			new Request("http://localhost/api/rating", { headers: headers }),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.rating).toBe(1500);
		expect(body.rd).toBe(350);
		expect(body.gamesPlayed).toBe(0);
	});
});

// ── GET /api/rating/:userId ──

describe("GET /api/rating/:userId", () => {
	it("returns default values when user has no rating entry", async () => {
		const res = await app.handle(
			new Request(
				"http://localhost/api/rating/00000000-0000-0000-0000-000000000099",
			),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.rating).toBe(1500);
		expect(body.rd).toBe(350);
		expect(body.gamesPlayed).toBe(0);
		expect(body.userId).toBe("00000000-0000-0000-0000-000000000099");
	});

	it("returns actual rating when user has played", async () => {
		const { headers, user } = await getAuthHeaders(app);
		const userId = user.user.id;

		// Create rating entry via authenticated endpoint
		await app.handle(
			new Request("http://localhost/api/rating", { headers: headers }),
		);

		const res = await app.handle(
			new Request(`http://localhost/api/rating/${userId}`),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.userId).toBe(userId);
		expect(body.rating).toBe(1500);
		expect(body.gamesPlayed).toBe(0);
	});
});

// ── GET /api/rating/leaderboard ──

describe("GET /api/rating/leaderboard", () => {
	it("returns empty array when no players with games", async () => {
		const res = await app.handle(
			new Request("http://localhost/api/rating/leaderboard"),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([]);
	});

	it("returns sorted players with gamesPlayed >= 1", async () => {
		// Create two users
		const user1 = await createTestUser(app);
		const user2 = await createTestUser(app);

		// Submit a casual match so both get gamesPlayed=1
		const matchBody = makeMatchBody({
			player1Id: user1.body.user.id,
			player2Id: user2.body.user.id,
			winnerId: user1.body.user.id,
			mode: "casual",
		});

		await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: internalHeaders(),
				body: JSON.stringify(matchBody),
			}),
		);

		const res = await app.handle(
			new Request("http://localhost/api/rating/leaderboard"),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.length).toBe(2);
		for (const entry of body) {
			expect(entry.gamesPlayed).toBeGreaterThanOrEqual(1);
			expect(entry.name).toBeDefined();
			expect(entry.rating).toBeDefined();
		}
	});

	it("does not include players with 0 games", async () => {
		// Create a user and init their rating without playing
		const { headers } = await getAuthHeaders(app);
		await app.handle(
			new Request("http://localhost/api/rating", { headers: headers }),
		);

		const res = await app.handle(
			new Request("http://localhost/api/rating/leaderboard"),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([]);
	});
});

// ── GET /api/rating/match-history/:userId ──

describe("GET /api/rating/match-history/:userId", () => {
	it("returns empty array when no matches", async () => {
		const user1 = await createTestUser(app);
		const res = await app.handle(
			new Request(
				`http://localhost/api/rating/match-history/${user1.body.user.id}`,
			),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([]);
	});

	it("returns matches for the player ordered by createdAt DESC", async () => {
		const user1 = await createTestUser(app);
		const user2 = await createTestUser(app);

		// Submit two matches
		const match1 = makeMatchBody({
			roomId: "room-history-1",
			player1Id: user1.body.user.id,
			player2Id: user2.body.user.id,
			mode: "casual",
		});
		const match2 = makeMatchBody({
			roomId: "room-history-2",
			player1Id: user1.body.user.id,
			player2Id: user2.body.user.id,
			mode: "casual",
		});

		await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: internalHeaders(),
				body: JSON.stringify(match1),
			}),
		);
		await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: internalHeaders(),
				body: JSON.stringify(match2),
			}),
		);

		const res = await app.handle(
			new Request(
				`http://localhost/api/rating/match-history/${user1.body.user.id}`,
			),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.length).toBe(2);
		// Most recent first
		expect(body[0].roomId).toBe("room-history-2");
		expect(body[1].roomId).toBe("room-history-1");
	});
});

// ── POST /api/rating/internal/match-result ──

describe("POST /api/rating/internal/match-result", () => {
	it("returns 401 when missing X-Internal-Secret", async () => {
		const user1 = await createTestUser(app);
		const user2 = await createTestUser(app);
		const body = makeMatchBody({
			player1Id: user1.body.user.id,
			player2Id: user2.body.user.id,
		});

		const res = await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
		);
		expect(res.status).toBe(401);
	});

	it("returns 401 when wrong X-Internal-Secret", async () => {
		const user1 = await createTestUser(app);
		const user2 = await createTestUser(app);
		const body = makeMatchBody({
			player1Id: user1.body.user.id,
			player2Id: user2.body.user.id,
		});

		const res = await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: internalHeaders("wrong-secret"),
				body: JSON.stringify(body),
			}),
		);
		expect(res.status).toBe(401);
	});

	it("creates match result for casual mode (no rating changes)", async () => {
		const user1 = await createTestUser(app);
		const user2 = await createTestUser(app);
		const matchBody = makeMatchBody({
			player1Id: user1.body.user.id,
			player2Id: user2.body.user.id,
			winnerId: user1.body.user.id,
			mode: "casual",
		});

		const res = await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: internalHeaders(),
				body: JSON.stringify(matchBody),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.ratings.player1).toBeNull();
		expect(body.ratings.player2).toBeNull();

		// Check that gamesPlayed incremented but rating stayed default
		const p1Res = await app.handle(
			new Request(
				`http://localhost/api/rating/${user1.body.user.id}`,
			),
		);
		const p1 = await p1Res.json();
		expect(p1.gamesPlayed).toBe(1);
		expect(p1.rating).toBe(1500);
	});

	it("creates match result for ranked mode with Glicko-2 rating updates", async () => {
		const user1 = await createTestUser(app);
		const user2 = await createTestUser(app);
		const matchBody = makeMatchBody({
			player1Id: user1.body.user.id,
			player2Id: user2.body.user.id,
			winnerId: user1.body.user.id,
			mode: "ranked",
		});

		const res = await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: internalHeaders(),
				body: JSON.stringify(matchBody),
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.ratings.player1).toBeDefined();
		expect(body.ratings.player2).toBeDefined();

		// Winner should gain rating, loser should lose rating
		expect(body.ratings.player1.rating).toBeGreaterThan(1500);
		expect(body.ratings.player2.rating).toBeLessThan(1500);

		// Verify persisted ratings changed
		const p1Res = await app.handle(
			new Request(
				`http://localhost/api/rating/${user1.body.user.id}`,
			),
		);
		const p1 = await p1Res.json();
		expect(p1.rating).toBeGreaterThan(1500);
		expect(p1.gamesPlayed).toBe(1);
	});

	it("returns duplicate flag on duplicate roomId", async () => {
		const user1 = await createTestUser(app);
		const user2 = await createTestUser(app);
		const matchBody = makeMatchBody({
			roomId: "room-duplicate-test",
			player1Id: user1.body.user.id,
			player2Id: user2.body.user.id,
			mode: "casual",
		});

		// First submission
		const res1 = await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: internalHeaders(),
				body: JSON.stringify(matchBody),
			}),
		);
		expect(res1.status).toBe(200);
		const body1 = await res1.json();
		expect(body1.success).toBe(true);
		expect(body1.duplicate).toBeUndefined();

		// Duplicate submission
		const res2 = await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: internalHeaders(),
				body: JSON.stringify(matchBody),
			}),
		);
		expect(res2.status).toBe(200);
		const body2 = await res2.json();
		expect(body2.success).toBe(true);
		expect(body2.duplicate).toBe(true);
	});

	it("validates request body", async () => {
		// Missing required fields
		const res = await app.handle(
			new Request("http://localhost/api/rating/internal/match-result", {
				method: "POST",
				headers: internalHeaders(),
				body: JSON.stringify({ roomId: "room-bad" }),
			}),
		);
		// Elysia returns 422 for validation errors
		expect(res.status).toBe(422);
	});
});
