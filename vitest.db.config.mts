import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Database tests: need a migrated + seeded local Supabase (`npm run db:start && npm run db:reset`).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./scripts/test-stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.db.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
