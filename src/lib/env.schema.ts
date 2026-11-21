import { z } from "zod";

/** "true"/"false" strings from the environment → boolean. */
const flag = (fallback: boolean) =>
  z
    .enum(["true", "false"])
    .default(fallback ? "true" : "false")
    .transform((v) => v === "true");

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

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
    GOOGLE_OAUTH_REDIRECT_URI: z.url().optional(),
    ENCRYPTION_KEY: encryptionKey,
    MAIL_PROVIDER: z.enum(["console", "resend", "gmail"]).default("console"),
    RESEND_API_KEY: optionalString,
    MAIL_FROM: z.string().min(3).default("LinguaPath <reports@example.com>"),
    EMAIL_DAILY_BUDGET: z.coerce.number().int().min(0).max(100).default(90),
    CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters"),
    BILLING_ENABLED: flag(false),
    AI_ENABLED: flag(false),
    DEFAULT_TIMEZONE: z.string().min(1).default("Asia/Riyadh"),
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
