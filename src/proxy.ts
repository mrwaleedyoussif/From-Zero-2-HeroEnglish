import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { refreshSession } from "./lib/supabase/proxy";

const intl = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = intl(request);
  return refreshSession(request, response);
}

export const config = {
  // All paths except API/auth routes, Next internals, Vercel internals and files with an extension.
  matcher: "/((?!api|auth|trpc|_next|_vercel|.*\\..*).*)",
};
