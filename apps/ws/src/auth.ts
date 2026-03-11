import { and, eq, gt } from "drizzle-orm";
import { sessions, users } from "@repo/database/schema";
import { db } from "./db";

export async function validateSession(
	token: string,
): Promise<{ userId: string; name: string } | null> {
	const result = await db
		.select({
			userId: sessions.userId,
			name: users.name,
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
		.limit(1);

	const row = result[0];
	if (!row) return null;

	return { userId: row.userId, name: row.name };
}
