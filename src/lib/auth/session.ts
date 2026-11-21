import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { loadAuthority } from "./authority";
import { evaluateAny } from "./engine";
import { userContexts } from "./scope";
import { verifyViewAs } from "./view-as-token";

export const VIEW_AS_COOKIE = "lp_view_as";

export interface Profile {
  id: string;
  school_id: string | null;
  kind: "staff" | "student";
  username: string | null;
  full_name: string;
  email: string | null;
  locale: "en" | "ar";
  status: "active" | "disabled";
}

export interface Actor {
  /** The person actually signed in. */
  real: Profile;
  /** Set while the real user is viewing the app as someone else (read-only). */
  viewAs: Profile | null;
  /** Whose permissions and data the UI shows: viewAs ?? real. */
  effective: Profile;
}

const profileColumns = "id, school_id, kind, username, full_name, email, locale, status";

async function loadProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("id", id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

/** The signed-in user (validated with Supabase Auth), or null. Cached per request. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const real = await loadProfile(user.id);
  if (!real || real.status !== "active") return null;

  const token = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  const targetId = verifyViewAs(serverEnv().ENCRYPTION_KEY, token, real.id);
  if (targetId && targetId !== real.id) {
    const [authority, contexts, target] = await Promise.all([
      loadAuthority(real.id),
      userContexts(targetId),
      loadProfile(targetId),
    ]);
    // Re-checked on every request: losing users:impersonate ends the session immediately.
    if (target && evaluateAny(authority, "users:impersonate", contexts)) {
      return { real, viewAs: target, effective: target };
    }
  }
  return { real, viewAs: null, effective: real };
});
