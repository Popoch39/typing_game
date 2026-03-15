import { cors } from "@elysiajs/cors";
import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../db";
import { auth } from "../lib/auth";
import { gameRoutes } from "../routes/game";
import { ratingRoutes } from "../routes/rating";

export function createTestApp() {
	return new Elysia()
		.use(
			cors({
				origin: process.env.FRONTEND_URL || "http://localhost:3000",
				methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
				credentials: true,
				allowedHeaders: ["Content-Type", "Authorization"],
			}),
		)
		.mount(auth.handler)
		.use(gameRoutes)
		.use(ratingRoutes)
		.get("/health", () => ({ status: "bruh" }));
}

let userCounter = 0;

export async function createTestUser(app: ReturnType<typeof createTestApp>) {
	userCounter++;
	const email = `test-${Date.now()}-${userCounter}@example.com`;
	const name = `Test User ${userCounter}`;
	const password = "password123";

	const response = await app.handle(
		new Request("http://localhost/api/auth/sign-up/email", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password, name }),
		}),
	);

	const cookies = response.headers.getSetCookie();
	const body = await response.json();

	return { response, cookies, body, email, name, password };
}

export async function getAuthHeaders(app: ReturnType<typeof createTestApp>) {
	const { cookies, body, email, name } = await createTestUser(app);
	return {
		headers: { Cookie: cookies.join("; ") },
		user: body,
		email,
		name,
	};
}

export async function truncateAll() {
	await db.execute(
		sql`TRUNCATE TABLE match_results, player_ratings, game_scores, sessions, accounts, verifications, users CASCADE`,
	);
}
