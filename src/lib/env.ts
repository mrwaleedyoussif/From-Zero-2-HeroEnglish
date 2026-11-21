import "server-only";
import { parseEnv, serverEnvSchema, type ServerEnv } from "./env.schema";

let cached: ServerEnv | undefined;

/**
 * Validated server environment. Lazy, so `next build` works without secrets;
 * the first server code that needs a variable fails fast with a clear message.
 */
export function serverEnv(): ServerEnv {
  cached ??= parseEnv(serverEnvSchema, process.env);
  return cached;
}
