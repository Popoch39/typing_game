// Set test environment BEFORE any imports
process.env.DATABASE_URL =
  "postgres://postgres:postgres@localhost:5433/typing_game_test";
process.env.BETTER_AUTH_SECRET = "test-secret-key-for-testing";
process.env.BETTER_AUTH_URL = "http://localhost:3001";
process.env.FRONTEND_URL = "http://localhost:3000";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
const migrationDb = drizzle(migrationClient);

await migrate(migrationDb, { migrationsFolder: "./drizzle" });
await migrationClient.end();
