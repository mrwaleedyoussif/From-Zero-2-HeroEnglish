/**
 * Bootstrap the first Owner on a fresh (seed-free) Supabase project.
 *
 *   npm run owner:create -- --email you@example.com --name "Your Name"
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 * (e.g. `node --env-file=.env.local …`). Uses the service role because no Owner exists yet
 * to authorise the change; the audit log records it with no actor. Safe to re-run.
 * After this, sign in at /login with that email (magic link) or Google.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" } },
});
const email = values.email?.trim().toLowerCase();
const name = values.name?.trim() || "Owner";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run owner:create -- --email you@example.com --name "Your Name"');
  process.exit(1);
}
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserId(address: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === address);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main(address: string) {
  let id = await findUserId(address);
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({
      email: address,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error || !data.user) throw error ?? new Error("createUser failed");
    id = data.user.id;
  }
  // Create the profile, or re-activate an existing one without renaming it.
  const current = await db.from("profiles").select("id").eq("id", id).maybeSingle();
  const profile = current.data
    ? await db.from("profiles").update({ status: "active" }).eq("id", id)
    : await db
        .from("profiles")
        .insert({ id, school_id: null, kind: "staff", full_name: name, email: address });
  if (profile.error) throw profile.error;

  const { data: role, error: roleError } = await db
    .from("roles")
    .select("id")
    .eq("default_scope_type", "platform")
    .eq("is_system", true)
    .single();
  if (roleError || !role) throw roleError ?? new Error("Owner role missing — run migrations first");
  const existing = await db
    .from("user_roles")
    .select("id")
    .eq("user_id", id)
    .eq("role_id", role.id)
    .eq("scope_type", "platform");
  if (!existing.data?.length) {
    const grant = await db
      .from("user_roles")
      .insert({ user_id: id, role_id: role.id, scope_type: "platform" });
    if (grant.error) throw grant.error;
  }
  console.log(`Owner ready: ${address}. Sign in at /login.`);
}

main(email).catch((e: unknown) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
