import { describe, expect, it } from "bun:test";
import { createTestApp } from "../test/helpers";

const app = createTestApp();

describe("GET /health", () => {
	it("should return status ok", async () => {
		const res = await app.handle(new Request("http://localhost/health"));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ status: "bruh" });
	});
});

describe("CORS", () => {
	it("should return correct CORS headers on OPTIONS", async () => {
		const res = await app.handle(
			new Request("http://localhost/health", {
				method: "OPTIONS",
				headers: {
					Origin: "http://localhost:3000",
					"Access-Control-Request-Method": "GET",
				},
			}),
		);

		expect(res.headers.get("access-control-allow-origin")).toBe(
			"http://localhost:3000",
		);
		expect(res.headers.get("access-control-allow-credentials")).toBe("true");
	});
});
