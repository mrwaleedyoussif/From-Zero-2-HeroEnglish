import { describe, expect, it } from "vitest";
import { parseEnv, publicEnvSchema, serverEnvSchema } from "./env.schema";

const valid = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  CRON_SECRET: "x".repeat(32),
};

describe("env schema", () => {
  it("accepts a minimal valid server env and applies defaults", () => {
    const env = parseEnv(serverEnvSchema, valid);
    expect(env.BILLING_ENABLED).toBe(false);
    expect(env.AI_ENABLED).toBe(false);
    expect(env.MAIL_PROVIDER).toBe("console");
    expect(env.EMAIL_DAILY_BUDGET).toBe(90);
    expect(env.DEFAULT_TIMEZONE).toBe("Asia/Riyadh");
  });

  it("trims pasted values and treats blank ones as unset", () => {
    const env = parseEnv(serverEnvSchema, {
      ...valid,
      GOOGLE_OAUTH_CLIENT_ID: "  id.apps.googleusercontent.com\n",
      GOOGLE_OAUTH_CLIENT_SECRET: " \n",
    });
    expect(env.GOOGLE_OAUTH_CLIENT_ID).toBe("id.apps.googleusercontent.com");
    expect(env.GOOGLE_OAUTH_CLIENT_SECRET).toBeUndefined();
  });

  it("parses boolean flags from strings", () => {
    const env = parseEnv(serverEnvSchema, {
      ...valid,
      BILLING_ENABLED: "true",
    });
    expect(env.BILLING_ENABLED).toBe(true);
  });

  it("rejects an encryption key that is not 32 bytes", () => {
    expect(() => parseEnv(serverEnvSchema, { ...valid, ENCRYPTION_KEY: "short" })).toThrow(
      /ENCRYPTION_KEY/,
    );
  });

  it("requires RESEND_API_KEY when the provider is resend", () => {
    expect(() => parseEnv(serverEnvSchema, { ...valid, MAIL_PROVIDER: "resend" })).toThrow(
      /RESEND_API_KEY/,
    );
  });

  it("caps the email budget at Resend's free 100/day", () => {
    expect(() => parseEnv(serverEnvSchema, { ...valid, EMAIL_DAILY_BUDGET: "150" })).toThrow(
      /EMAIL_DAILY_BUDGET/,
    );
  });

  it("lists every missing variable without leaking values", () => {
    try {
      parseEnv(publicEnvSchema, {
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "secret-value",
      });
      expect.unreachable();
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toContain("NEXT_PUBLIC_APP_URL");
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(message).not.toContain("secret-value");
    }
  });
});
