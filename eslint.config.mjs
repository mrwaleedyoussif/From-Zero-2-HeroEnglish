import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Secrets stay server-side: client code reads env only via src/lib/env.public.ts.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/env",
              importNames: ["default"],
              message: "Import { serverEnv } explicitly; never from client components.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "src/types/db.ts",
  ]),
]);

export default eslintConfig;
