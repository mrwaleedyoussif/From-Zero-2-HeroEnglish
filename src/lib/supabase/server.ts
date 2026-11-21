import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/types/db";

/** Supabase client acting as the signed-in user (RLS applies). Use in Server Components and actions. */
export async function createClient() {
  const cookieStore = await cookies();
  const env = publicEnv();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
          } catch {
            // Called from a Server Component: cookies are read-only there; the proxy refreshes them.
          }
        },
      },
    },
  );
}
