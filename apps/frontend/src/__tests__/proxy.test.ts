import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();
const mockNext = vi.fn();
const mockGetSessionCookie = vi.fn();

vi.mock("better-auth/cookies", () => ({
	getSessionCookie: (...args: unknown[]) => mockGetSessionCookie(...args),
}));

vi.mock("next/server", () => ({
	NextResponse: {
		redirect: (...args: unknown[]) => mockRedirect(...args),
		next: (...args: unknown[]) => mockNext(...args),
	},
}));

import { config, proxy } from "../proxy";

function createRequest(pathname: string) {
	const url = `http://localhost:3000${pathname}`;
	return {
		nextUrl: new URL(url),
		url,
	} as unknown as NextRequest;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockRedirect.mockImplementation((url: URL) => ({
		type: "redirect",
		url: url.toString(),
	}));
	mockNext.mockImplementation(() => ({ type: "next" }));
});

describe("proxy", () => {
	it("should redirect to /login when no cookie on protected path", () => {
		mockGetSessionCookie.mockReturnValue(null);
		const request = createRequest("/dashboard");

		proxy(request);

		expect(mockRedirect).toHaveBeenCalled();
		const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
		expect(redirectUrl.pathname).toBe("/login");
	});

	it("should redirect to / when cookie exists on /login", () => {
		mockGetSessionCookie.mockReturnValue("session-token");
		const request = createRequest("/login");

		proxy(request);

		expect(mockRedirect).toHaveBeenCalled();
		const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
		expect(redirectUrl.pathname).toBe("/");
	});

	it("should redirect to / when cookie exists on /register", () => {
		mockGetSessionCookie.mockReturnValue("session-token");
		const request = createRequest("/register");

		proxy(request);

		expect(mockRedirect).toHaveBeenCalled();
		const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
		expect(redirectUrl.pathname).toBe("/");
	});

	it("should call next() when cookie exists on protected path", () => {
		mockGetSessionCookie.mockReturnValue("session-token");
		const request = createRequest("/dashboard");

		proxy(request);

		expect(mockNext).toHaveBeenCalled();
		expect(mockRedirect).not.toHaveBeenCalled();
	});
});

describe("config.matcher", () => {
	it("should export matcher correctly", () => {
		expect(config.matcher).toBeDefined();
		expect(Array.isArray(config.matcher)).toBe(true);
		expect(config.matcher.length).toBeGreaterThan(0);
	});
});
