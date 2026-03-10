import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
      ],
      exclude: ["src/test/**", "**/__tests__/**"],
    },
  },
});
