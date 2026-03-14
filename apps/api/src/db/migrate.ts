import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
	const client = postgres(process.env.DATABASE_URL!, { max: 1 });
	const db = drizzle(client);

	await migrate(db, { migrationsFolder: "./drizzle" });
	await client.end();

	console.log("Migrations complete");
}

main();
