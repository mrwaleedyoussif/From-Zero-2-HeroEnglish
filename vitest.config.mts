import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./scripts/test-stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
    // `npm run test:coverage`: the placement engine must stay at 100% (SPEC §7).
    coverage: {
      provider: "v8",
      include: [
        "src/features/placement/engine/**",
        "src/features/learning/recommend/**",
        "src/features/rewards/engine/**",
        "src/features/insights/analytics.ts",
      ],
      exclude: ["**/*.test.ts", "**/types.ts"],
      thresholds: { 100: true },
    },
  },
});
