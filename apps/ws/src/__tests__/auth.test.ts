import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock the db module before importing auth
const mockSelect = mock(() => {});
const mockFrom = mock(() => {});
const mockInnerJoin = mock(() => {});
const mockWhere = mock(() => {});
const mockLimit = mock(() => {});

mock.module("../db", () => ({
	db: {
		select: (...args: unknown[]) => {
			mockSelect(...args);
			return {
				from: (...fArgs: unknown[]) => {
					mockFrom(...fArgs);
					return {
						innerJoin: (...jArgs: unknown[]) => {
							mockInnerJoin(...jArgs);
							return {
								where: (...wArgs: unknown[]) => {
									mockWhere(...wArgs);
									return {
										limit: (...lArgs: unknown[]) => {
											mockLimit(...lArgs);
											return mockLimit.mock.results?.[
												mockLimit.mock.calls.length - 1
											]?.value;
										},
									};
								},
							};
						},
					};
				},
			};
		},
	},
}));

// Mock drizzle-orm operators
mock.module("drizzle-orm", () => ({
	and: (...args: unknown[]) => args,
	eq: (a: unknown, b: unknown) => [a, b],
	gt: (a: unknown, b: unknown) => [a, b],
}));

// Mock schema
mock.module("@repo/database/schema", () => ({
	sessions: { userId: "sessions.userId", token: "sessions.token", expiresAt: "sessions.expiresAt" },
	users: { id: "users.id", name: "users.name" },
}));

import { validateSession } from "../auth";

describe("validateSession", () => {
	beforeEach(() => {
		mockLimit.mockReset();
	});

	it("returns userId and name for valid token", async () => {
		mockLimit.mockReturnValue([{ userId: "u1", name: "Alice" }]);
		const result = await validateSession("valid-token");
		expect(result).toEqual({ userId: "u1", name: "Alice" });
	});

	it("returns null for invalid/expired token", async () => {
		mockLimit.mockReturnValue([]);
		const result = await validateSession("invalid-token");
		expect(result).toBeNull();
	});

	it("calls limit(1)", async () => {
		mockLimit.mockReturnValue([]);
		await validateSession("any-token");
		expect(mockLimit).toHaveBeenCalledWith(1);
	});
});
