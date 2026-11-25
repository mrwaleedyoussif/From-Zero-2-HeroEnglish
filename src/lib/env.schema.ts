import { z } from "zod";

/** "true"/"false" strings from the environment → boolean. */
const flag = (fallback: boolean) =>
  z
    .enum(["true", "false"])
    .default(fallback ? "true" : "false")
    .transform((v) => v === "true");

/** Values pasted into a hosting dashboard often carry a stray space, line break or quotes. */
export const tidy = (v: string | undefined): string | undefined =>
  v
    ?.trim()
    .replace(/^(["'])(.*)\1$/s, "$2")
    .trim() || undefined;
const optionalString = z.string().optional().transform(tidy);

/** Variables that may reach the browser (NEXT_PUBLIC_*). */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

/** Base64 string that decodes to exactly 32 bytes (AES-256-GCM key). */
const encryptionKey = z.string().refine((v) => Buffer.from(v, "base64").length === 32, {
  message: "ENCRYPTION_KEY must be base64 for 32 random bytes (openssl rand -base64 32)",
});

/** Server-only variables. Integrations used in later phases are optional until then. */
export const serverEnvSchema = publicEnvSchema
  .extend({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_DB_URL: optionalString,
    GOOGLE_OAUTH_CLIENT_ID: optionalString,
    GOOGLE_OAUTH_CLIENT_SECRET: optionalString,
    GOOGLE_OAUTH_REDIRECT_URI: optionalString.pipe(z.url().optional()),
    /** Fallback when the Owner has not connected Drive in the app yet (scripts, first deploy). */
    GOOGLE_REFRESH_TOKEN: optionalString,
    /** google = the Owner's Drive; fake = a local folder with the same layout (dev/tests). */
    STORAGE_DRIVER: z.enum(["google", "fake"]).default("google"),
    FAKE_DRIVE_DIR: optionalString,
    ENCRYPTION_KEY: encryptionKey,
    MAIL_PROVIDER: z.enum(["console", "resend", "gmail"]).default("console"),
    RESEND_API_KEY: optionalString,
    MAIL_FROM: z.string().min(3).default("Zero-2-Hero English <reports@example.com>"),
    EMAIL_DAILY_BUDGET: z.coerce.number().int().min(0).max(100).default(90),
    CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters"),
    /** Open sign-up for general learners (people outside a school). Off until the Owner is ready. */
    GENERAL_LEARNERS_ENABLED: flag(false),
    /** Where to email "a general learner is waiting for approval" (the Owner's address). */
    OWNER_NOTIFY_EMAIL: optionalString.pipe(z.email().optional()),
    /** New general learners allowed per day: protects the free database and email budget. */
    GENERAL_DAILY_SIGNUPS: z.coerce.number().int().min(0).max(10000).default(50),
    BILLING_ENABLED: flag(false),
    /** AI feedback on writing and answers (lib/ai). Needs ANTHROPIC_API_KEY; off = rules only. */
    AI_ENABLED: flag(false),
    ANTHROPIC_API_KEY: optionalString,
    /** Also let the AI reader draw word pictures (extra cost). Off: AI marks writing only. */
    AI_PICTURES: flag(false),
    AI_MODEL: z.string().min(3).default("claude-opus-5-5"),
    DEFAULT_TIMEZONE: z.string().min(1).default("Asia/Riyadh"),
    /** Multiplies sign-in rate limits; raise only for automated test runs (default 1). */
    RATE_LIMIT_MULTIPLIER: z.coerce.number().int().min(1).max(1000).default(1),
  })
  .superRefine((env, ctx) => {
    if (env.MAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required when MAIL_PROVIDER=resend",
      });
    }
  });

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Parse and throw one readable error listing every bad variable (never their values). */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, unknown>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`Invalid environment variables:\n${lines.join("\n")}`);
  }
  return result.data;
}
