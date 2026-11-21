# PROGRESS (Claude Code updates this at the end of every session — keep ≤ 60 lines total)

## Current phase
Phase 1 — done (2026-11-21). Next: Phase 2.

## Done
- Phase 0: Next 16.4 + Tailwind 4 + shadcn (RTL) + next-intl (en/ar, `/[locale]`), SPEC §16 tokens, Zod env, skeleton, CI.
- Phase 1 DB (`supabase/migrations/2026112100000{1..5}`): core + access tables, RLS on all (default deny, anon revoked), `auth_can()`, `auth_can_user()`, anti-escalation `auth_can_grant()` / `auth_can_assign_role()`, append-only `audit_log` via triggers + `log_audit()`, RPCs `assign_class`, `apply_supervision_defaults`. Catalogue (39 permissions, 8 roles, supervision defaults) is a migration.
- Auth: staff magic link (invite-only) + Google; students school code + username + 6-digit PIN (`username@<code>.students.local`); `/auth/callback` rejects accounts without an active profile.
- `src/lib/auth/`: `engine.ts` (pure, mirrors SQL), `can.ts`, `authority.ts`, `session.ts` (view-as), `guard.ts`, `student-identity.ts`.
- Owner console `src/app/[locale]/(gates)/owner/`: schools/years/grades/classes, users (invite, add student, reset PIN, disable), CSV import (preview → apply → one-time PINs + printable cards), class login cards, roles matrix, user detail (roles, overrides, effective permissions with "why"), supervision, audit log, view-as (audited, read-only, 60 min).
- Seed `supabase/seed/10_demo.sql`: RIY01, grades 1–6, 4A/4B, one user per role, 20 students (PIN 246810).
- Tests: 53 unit, 16 DB (`npm run test:db`: isolation, escalation, audit, acceptance, TS↔SQL agreement on 1,440 cases), 7 Playwright. CI has a `database` job.
- `npm run owner:create -- --email … --name …` bootstraps the real Owner.

## Next
- Phase 2 (gates, registry, visibility, entitlements). Move the owner console onto `src/gates/owner.config.ts`; replace `features/owner/sections.ts` with registry keys; `/home` becomes gate landing.

## Decisions (with one-line reasons)
- Stack fixed in CLAUDE.md. Gates live in `src/app/[locale]/(gates)/` (bilingual).
- `cacheComponents` off: every console page is per-user; it forced Suspense around every cookie read.
- Permissions catalogue + default roles in a migration (not `seed/`), so seed-free production gets them.
- Teacher "own classes" = class-scoped `user_roles` + `teaching_assignments` written together (`assign_class`). Coach→teacher is supervision data, not permission.
- Grant rules: you can only grant/assign permissions you hold, in your scope. Principal defaults ⊇ in-school roles so they can manage their school. Owner role (system, platform) is locked in the matrix.
- Login cards = print-styled HTML (browser prints Arabic correctly; "Save as PDF" gives the PDF). PINs are hashed, so cards are made when PINs are (re)set.
- CSV import creates staff silently (no email burst); they sign in from /login. Max 300 rows/file.
- IDs validated with `z.guid()` (Postgres accepts any UUID; `z.uuid()` rejects non-v4).
- Deps: `@supabase/supabase-js` + `@supabase/ssr` (auth/DB), `papaparse` (CSV), `pg` (dev, DB tests), `next-themes`, `cn`.

## Open questions for the Owner
- `.env.example` still blocked by `.claude/settings.json` deny `./.env.*` (draft ready). Allow it or add it yourself.
- GitHub repo to push to (connect GitHub, then send `owner/repo`).
- Before real staff: hosted Supabase → Auth → SMTP = Resend (built-in email is a few/hour); enable Google provider; set Site URL + redirect URLs to your domain.
