import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { auth } from "./lib/auth";
import { gameRoutes } from "./routes/game";

const app = new Elysia()
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
	.get("/health", () => ({ status: "bruh" }))
	.listen(Number(process.env.PORT) || 3001);

console.log(`API running at ${app.server?.hostname}:${app.server?.port}`);
