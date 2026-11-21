import { parseEnv, publicEnvSchema, type PublicEnv } from "./env.schema";

let cached: PublicEnv | undefined;

/** Validated public environment, safe in client and server code. */
export function publicEnv(): PublicEnv {
  // Each NEXT_PUBLIC_* must be referenced literally so Next.js can inline it.
  cached ??= parseEnv(publicEnvSchema, {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return cached;
}
