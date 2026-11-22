import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, makeNonce, STATIC_HEADERS } from "./headers";

describe("security headers", () => {
  it("allows only nonce'd scripts, no plugins, no framing; Supabase for auth", () => {
    const csp = contentSecurityPolicy("abc", { supabaseUrl: "https://x.supabase.co/rest" });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self' https://x.supabase.co");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("relaxes only what Next.js dev mode needs", () => {
    const csp = contentSecurityPolicy("n", { dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("makes unique base64 nonces and strict static headers", () => {
    const a = makeNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(makeNonce()).not.toBe(a);
    expect(STATIC_HEADERS["X-Frame-Options"]).toBe("DENY");
    expect(STATIC_HEADERS["Permissions-Policy"]).toContain("microphone=(self)");
  });
});
