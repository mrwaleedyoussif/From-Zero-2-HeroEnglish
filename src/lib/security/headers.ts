/**
 * Security headers (SPEC §15 "strict CSP"). Pure, so the policy is unit-tested.
 * Scripts: only Next's own, carrying the per-request nonce ('strict-dynamic' lets them load
 * their chunks). Styles: inline is needed for style attributes (bar widths, theme colours).
 */
export function contentSecurityPolicy(
  nonce: string,
  opts: { supabaseUrl?: string; dev?: boolean },
): string {
  const supabase = opts.supabaseUrl ? new URL(opts.supabaseUrl).origin : "";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(opts.dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "media-src": ["'self'", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(supabase ? [supabase] : []), ...(opts.dev ? ["ws:"] : [])],
    // 'self': PDF lessons are framed from /api/media.
    "frame-src": ["'self'", "https://www.youtube-nocookie.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!opts.dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** Headers for every page response (the CSP is added per request with its nonce). */
export const STATIC_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  // Microphone: speaking answers in the placement test. Nothing else is needed.
  "Permissions-Policy": "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
};

/** Random nonce for one response (base64 of 16 random bytes). */
export function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
