import { beforeEach, describe, expect, it } from "bun:test";
import { createTestApp, getAuthHeaders, truncateAll } from "../../test/helpers";

const app = createTestApp();

beforeEach(async () => {
	await truncateAll();
});

describe("POST /api/game/scores", () => {
	it("should reject unauthenticated request", async () => {
		const res = await app.handle(
			new Request("http://localhost/api/game/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					wpm: 80,
					accuracy: 95.5,
					duration: 60,
					mode: "normal",
				}),
			}),
		);

		expect(res.status).toBe(401);
	});

	it("should create a score for authenticated user", async () => {
		const { headers, user } = await getAuthHeaders(app);

		const res = await app.handle(
			new Request("http://localhost/api/game/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...headers },
				body: JSON.stringify({
					wpm: 80,
					accuracy: 95.5,
					duration: 60,
					mode: "normal",
				}),
			}),
		);

		expect(res.status).toBe(200);
		const score = await res.json();
		expect(score.wpm).toBe(80);
		expect(score.accuracy).toBeCloseTo(95.5);
		expect(score.duration).toBe(60);
		expect(score.mode).toBe("normal");
		expect(score.userId).toBe(user.user.id);
	});
});

describe("GET /api/game/scores", () => {
	it("should reject unauthenticated request", async () => {
		const res = await app.handle(
			new Request("http://localhost/api/game/scores"),
		);

		expect(res.status).toBe(401);
	});

	it("should return scores for authenticated user", async () => {
		const { headers } = await getAuthHeaders(app);

		// Create a score first
		await app.handle(
			new Request("http://localhost/api/game/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...headers },
				body: JSON.stringify({
					wpm: 80,
					accuracy: 95.5,
					duration: 60,
					mode: "normal",
				}),
			}),
		);

		const res = await app.handle(
			new Request("http://localhost/api/game/scores", { headers }),
		);

		expect(res.status).toBe(200);
		const scores = await res.json();
		expect(scores).toHaveLength(1);
		expect(scores[0].wpm).toBe(80);
	});

	it("should support pagination", async () => {
		const { headers } = await getAuthHeaders(app);

		// Create 3 scores
		for (let i = 0; i < 3; i++) {
			await app.handle(
				new Request("http://localhost/api/game/scores", {
					method: "POST",
					headers: { "Content-Type": "application/json", ...headers },
					body: JSON.stringify({
						wpm: 80 + i,
						accuracy: 95,
						duration: 60,
						mode: "normal",
					}),
				}),
			);
		}

		const res = await app.handle(
			new Request("http://localhost/api/game/scores?limit=2&offset=1", {
				headers,
			}),
		);

		expect(res.status).toBe(200);
		const scores = await res.json();
		expect(scores).toHaveLength(2);
	});
});

describe("GET /api/game/leaderboard", () => {
	it("should be publicly accessible", async () => {
		const res = await app.handle(
			new Request("http://localhost/api/game/leaderboard"),
		);

		expect(res.status).toBe(200);
		const scores = await res.json();
		expect(Array.isArray(scores)).toBe(true);
	});

	it("should return scores sorted by wpm descending", async () => {
		const { headers } = await getAuthHeaders(app);

		// Create scores with different wpm
		for (const wpm of [60, 100, 80]) {
			await app.handle(
				new Request("http://localhost/api/game/scores", {
					method: "POST",
					headers: { "Content-Type": "application/json", ...headers },
					body: JSON.stringify({
						wpm,
						accuracy: 95,
						duration: 60,
						mode: "normal",
					}),
				}),
			);
		}

		const res = await app.handle(
			new Request("http://localhost/api/game/leaderboard"),
		);

		const scores = await res.json();
		expect(scores[0].wpm).toBe(100);
		expect(scores[1].wpm).toBe(80);
		expect(scores[2].wpm).toBe(60);
	});

	it("should filter by mode", async () => {
		const { headers } = await getAuthHeaders(app);

		await app.handle(
			new Request("http://localhost/api/game/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...headers },
				body: JSON.stringify({
					wpm: 80,
					accuracy: 95,
					duration: 60,
					mode: "normal",
				}),
			}),
		);

		await app.handle(
			new Request("http://localhost/api/game/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...headers },
				body: JSON.stringify({
					wpm: 90,
					accuracy: 95,
					duration: 30,
					mode: "speed",
				}),
			}),
		);

		const res = await app.handle(
			new Request("http://localhost/api/game/leaderboard?mode=speed"),
		);

		const scores = await res.json();
		expect(scores).toHaveLength(1);
		expect(scores[0].mode).toBe("speed");
	});

	it("should include userName", async () => {
		const { headers, name } = await getAuthHeaders(app);

		await app.handle(
			new Request("http://localhost/api/game/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...headers },
				body: JSON.stringify({
					wpm: 80,
					accuracy: 95,
					duration: 60,
					mode: "normal",
				}),
			}),
		);

		const res = await app.handle(
			new Request("http://localhost/api/game/leaderboard"),
		);

		const scores = await res.json();
		expect(scores[0].userName).toBe(name);
	});
});
