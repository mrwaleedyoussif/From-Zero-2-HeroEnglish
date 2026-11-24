import type { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { contentSecurityPolicy, makeNonce, STATIC_HEADERS } from "./lib/security/headers";
import { refreshSession } from "./lib/supabase/proxy";

const intl = createMiddleware(routing);

/**
 * Pass extra request headers to the app (what `NextResponse.next({ request: { headers } })` does),
 * so Next.js reads the CSP nonce and applies it to its own scripts. The language middleware has
 * already forwarded headers of its own (the page's locale): add to its list, never replace it,
 * or signed-in pages lose their language and fall back to English.
 */
function forwardRequestHeaders(
  response: NextResponse,
  request: NextRequest,
  extra: Record<string, string>,
) {
  const already = response.headers.get("x-middleware-override-headers");
  const names = new Set(already ? already.split(",") : request.headers.keys());
  if (!already)
    for (const [k, v] of request.headers) response.headers.set(`x-middleware-request-${k}`, v);
  for (const [k, v] of Object.entries(extra)) {
    names.add(k);
    response.headers.set(`x-middleware-request-${k}`, v);
  }
  response.headers.set("x-middleware-override-headers", [...names].join(","));
}

export default async function proxy(request: NextRequest) {
  const nonce = makeNonce();
  const csp = contentSecurityPolicy(nonce, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    dev: process.env.NODE_ENV === "development",
  });
  const response = intl(request);
  if (!response.headers.has("location"))
    forwardRequestHeaders(response, request, { "x-nonce": nonce, "content-security-policy": csp });
  response.headers.set("Content-Security-Policy", csp);
  for (const [k, v] of Object.entries(STATIC_HEADERS)) response.headers.set(k, v);
  return refreshSession(request, response);
}

export const config = {
  // All paths except API/auth routes, Next internals, Vercel internals and files with an extension.
  matcher: "/((?!api|auth|trpc|_next|_vercel|.*\\..*).*)",
};
