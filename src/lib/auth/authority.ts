import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AuthoritySnapshot, Override, RoleGrant, Scope, ScopeType } from "./engine";

function toScope(type: string, id: string | null): Scope {
  return { type: type as ScopeType, id };
}

/**
 * Load a user's roles + overrides (one round trip each), cached per request.
 * Reads run as the signed-in user, so RLS decides whose authority may be loaded.
 */
export const loadAuthority = cache(async (userId: string): Promise<AuthoritySnapshot> => {
  const supabase = await createClient();
  const [profile, roles, overrides] = await Promise.all([
    supabase.from("profiles").select("status").eq("id", userId).maybeSingle(),
    supabase
      .from("user_roles")
      .select("role_id, scope_type, scope_id, roles(key, status, role_permissions(permission_key))")
      .eq("user_id", userId),
    supabase
      .from("user_permission_overrides")
      .select("id, permission_key, effect, scope_type, scope_id, expires_at")
      .eq("user_id", userId),
  ]);
  if (profile.error || roles.error || overrides.error) {
    throw new Error("Could not load permissions", {
      cause: profile.error ?? roles.error ?? overrides.error,
    });
  }

  const grants: RoleGrant[] = (roles.data ?? []).flatMap((r) =>
    r.roles
      ? [
          {
            roleId: r.role_id,
            roleKey: r.roles.key,
            roleActive: r.roles.status === "active",
            scope: toScope(r.scope_type, r.scope_id),
            permissions: new Set(r.roles.role_permissions.map((p) => p.permission_key)),
          },
        ]
      : [],
  );
  const ovs: Override[] = (overrides.data ?? []).map((o) => ({
    id: o.id,
    permission: o.permission_key,
    effect: o.effect === "deny" ? "deny" : "allow",
    scope: toScope(o.scope_type, o.scope_id),
    expiresAt: o.expires_at ? new Date(o.expires_at) : null,
  }));

  return {
    userId,
    active: profile.data?.status === "active",
    roles: grants,
    overrides: ovs,
  };
});
