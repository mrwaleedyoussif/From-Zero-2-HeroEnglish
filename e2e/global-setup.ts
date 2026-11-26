import { execFileSync } from "node:child_process";

/**
 * Before the browser tests: the placement test is switched off by default (registry,
 * module.placement); the tests that use it need it on, as the Owner would switch it on.
 */
export default function globalSetup() {
  const db =
    process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  try {
    execFileSync("psql", [
      db,
      "-qc",
      `insert into public.visibility_rules (target_key, subject_type, subject_id, effect, note)
       select 'module.placement', 'plan', p.id, 'show', 'e2e: placement test on'
       from public.plans p where p.key = 'free'
       and not exists (select 1 from public.visibility_rules where target_key = 'module.placement')`,
    ]);
  } catch {
    // No local database (e.g. smoke tests against a deployed site): nothing to switch on.
  }
}
