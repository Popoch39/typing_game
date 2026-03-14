import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@repo/shared/scoring-engine": path.resolve(
				__dirname,
				"../../packages/shared/src/scoring-engine.ts",
			),
			"@repo/shared/ws-protocol": path.resolve(
				__dirname,
				"../../packages/shared/src/ws-protocol.ts",
			),
			"@repo/shared": path.resolve(
				__dirname,
				"../../packages/shared/src/index.ts",
			),
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		globals: true,
		css: false,
		coverage: {
			provider: "v8",
			include: [
				"src/validators/**",
				"src/hooks/**",
				"src/proxy.ts",
				"src/app/(auth)/**",
				"src/app/(protected)/**",
				"src/lib/typing-engine.ts",
				"src/lib/word-lists.ts",
				"src/stores/use-typing-store.ts",
			],
			exclude: ["src/test/**", "**/__tests__/**"],
		},
	},
});
