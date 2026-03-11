import { createDb } from "@repo/database";

export const db = createDb(process.env.DATABASE_URL!);
