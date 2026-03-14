import { beforeEach, describe, expect, it } from "bun:test";
import { createTestApp, createTestUser, truncateAll } from "../../test/helpers";

const app = createTestApp();

beforeEach(async () => {
	await truncateAll();
});

describe("Auth - Sign Up", () => {
	it("should sign up a new user", async () => {
		const res = await app.handle(
			new Request("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "new@example.com",
					password: "password123",
					name: "New User",
				}),
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.user).toBeDefined();
		expect(body.user.email).toBe("new@example.com");
		expect(body.user.name).toBe("New User");

		const cookies = res.headers.getSetCookie();
		expect(cookies.length).toBeGreaterThan(0);
	});

	it("should reject duplicate email", async () => {
		await createTestUser(app);
		const { email } = await createTestUser(app);

		// Try signing up with the same email again
		const res = await app.handle(
			new Request("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					password: "password123",
					name: "Duplicate User",
				}),
			}),
		);

		// Better Auth returns an error for duplicate emails
		const body = await res.json();
		expect(body.error || res.status !== 200).toBeTruthy();
	});

	it("should reject missing fields", async () => {
		const res = await app.handle(
			new Request("http://localhost/api/auth/sign-up/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "test@example.com" }),
			}),
		);

		const body = await res.json();
		expect(body.error || res.status !== 200).toBeTruthy();
	});
});

describe("Auth - Sign In", () => {
	it("should sign in with valid credentials", async () => {
		const { email, password } = await createTestUser(app);

		const res = await app.handle(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.session || body.token).toBeDefined();

		const cookies = res.headers.getSetCookie();
		expect(cookies.length).toBeGreaterThan(0);
	});

	it("should reject wrong password", async () => {
		const { email } = await createTestUser(app);

		const res = await app.handle(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password: "wrongpassword" }),
			}),
		);

		const body = await res.json();
		expect(body.error || res.status !== 200).toBeTruthy();
	});

	it("should reject non-existent user", async () => {
		const res = await app.handle(
			new Request("http://localhost/api/auth/sign-in/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "nobody@example.com",
					password: "password123",
				}),
			}),
		);

		const body = await res.json();
		expect(body.error || res.status !== 200).toBeTruthy();
	});
});

describe("Auth - Session", () => {
	it("should return session with valid cookie", async () => {
		const { cookies } = await createTestUser(app);

		const res = await app.handle(
			new Request("http://localhost/api/auth/get-session", {
				headers: { Cookie: cookies.join("; ") },
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.user).toBeDefined();
		expect(body.session).toBeDefined();
	});

	it("should reject request without cookie", async () => {
		const res = await app.handle(
			new Request("http://localhost/api/auth/get-session"),
		);

		const body = await res.json();
		// Better Auth returns null body or { session: null } when no cookie
		expect(body === null || body?.session === null).toBe(true);
	});
});

describe("Auth - Sign Out", () => {
	it("should invalidate the session", async () => {
		const { cookies } = await createTestUser(app);

		// Sign out
		await app.handle(
			new Request("http://localhost/api/auth/sign-out", {
				method: "POST",
				headers: { Cookie: cookies.join("; ") },
			}),
		);

		// Session should no longer be valid
		const res = await app.handle(
			new Request("http://localhost/api/auth/get-session", {
				headers: { Cookie: cookies.join("; ") },
			}),
		);

		const body = await res.json();
		// Better Auth returns null body or { session: null } after sign-out
		expect(body === null || body?.session === null).toBe(true);
	});
});
