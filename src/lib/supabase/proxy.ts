import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/** Refresh the Supabase session cookie on every request (runs in src/proxy.ts). */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response; // not configured yet (e.g. CI build): skip

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        for (const { name, value, options } of toSet)
          response.cookies.set(name, value, {
            ...options,
            // Server-only cookies (see lib/supabase/server.ts; that file can't be imported here).
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
          });
      },
    },
  });
  // Validates the JWT and refreshes it when needed. Do not remove.
  await supabase.auth.getUser();
  return response;
}
