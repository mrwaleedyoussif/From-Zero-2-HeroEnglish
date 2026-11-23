# PROGRESS (Claude Code updates this at the end of every session — keep ≤ 60 lines total)

## Current phase
Phase 9 built and LIVE at https://zero-2-heroenglish.com (Supabase `linguapath` eu-central-1; Vercel `linguapath` auto-deploys from GitHub `main`). A full review (2026-11-23) fixed the list below on branch `claude/zen-curie-nz8wj5` — **not live until merged to `main`**.

## Handoff — to put the review fixes live (in this order)
1. `npx supabase link --project-ref <ref>` then `npx supabase db push` (adds `20261130000001_review_hardening.sql`). Needs a Supabase access token `sbp_…`. The code also runs without it (feature switches then stay "on"), but push first.
2. Merge the branch into `main` (Vercel deploys; functions now run in `fra1`, next to the database). Then `E2E_BASE_URL=https://zero-2-heroenglish.com npm run test:smoke`.
3. Supabase dashboard (RUNBOOK §2 steps 7–8): turn public sign-ups off; raise the sign-in rate limit to ≥ 300 per 5 min (student logins all arrive from Vercel's addresses).
4. Still BLOCKED on the Owner: Google connect. The app now names the wrong setting (client secret / redirect address). If Google's own page says `invalid_client`, the **client ID** in Vercel is wrong. Then Create Drive folders → load the STEP pack (scripts/step-import/README.md) → Content → Check sheets → Apply.
5. Later: Resend SMTP; GitHub Actions `APP_URL` + secrets; STEP mock tests (3,000 items).

## Review 2026-11-23 (Done)
- Sign-in: real front page (was the Phase 0 placeholder); invitation emails sign in (`/auth/session` finishes fragment tokens); per-IP student limit 30 → 600 per 15 min; role grant inside account rollback; stray Google accounts removed; student PINs stored as a keyed hash (`lib/auth/pin-password.ts`, old PINs upgrade on first sign-in); session cookies HttpOnly; teachers can reset a PIN (Groups → student).
- Content/placement: late media is linked on the next Apply (`import/link-media.ts`); Drive renames handled; imports audited by counts; placement loaders throw, stuck tests recover (`unstick`), tied items share the draw; writing/speaking follow their feature switches; extra-time and easy-font accommodations applied; PDF lessons allowed by the CSP.
- Scheduler/rewards: email digests survive a cut-off run (`scheduler/email.ts`); bad school time zone can't stop ticks; archive pages by 1000; XP/coin totals paged (`rewards/totals.ts`); practice scored out of items served, lesson time bounded by the server; streaks skip the school weekend and use school-time days (`lib/time.ts`); "due soon" reminders with the daily tick; backup workflow fails on an empty dump.
- DB migration: profile identity frozen for signed-in users; class/people rows must match the row's school; `feature_flags_off_for`; `import_jobs` audit trigger dropped.
- Tests: 234 unit (engines 100%), 57 DB, 26 e2e (run one at a time: `workers: 1`).

## Done
- Phase 0: Next 16 + Tailwind 4 + shadcn (RTL) + next-intl (en/ar), SPEC §16 tokens, Zod env, CI.
- Phase 1: Core + Access tables with RLS, `auth_can*()`, anti-escalation, audit triggers; staff magic link/Google, student PIN; `src/lib/auth/*` (engine mirrors SQL); Owner console (schools, users, CSV import, login cards, roles matrix, user detail, supervision, audit, view-as); demo seed; `owner:create`.
- Phase 2: registry (`src/lib/registry.ts`, all keys + en/ar labels); config-driven gates × 5 + `gen:gate`; visibility engine (user > class > grade > school > role > plan) + Studio; plans/entitlements (`BILLING_ENABLED=false` → free `*`); school colour (WCAG).
- Phase 3: `lib/storage` (Google + fake drivers, Owner OAuth, AES-GCM secret, `drive:init`); content tables + RLS (learners never read items); Sheets import (validate → diff preview → apply, media by name, missing-file report); `/api/media/[id]`; `/teacher/library`.
- Phase 4: pure CAT engine (Rasch/EAP, balancing, stopping, scoring; 100% coverage) + `sim:placement` (MAE 0.32 ≤ 25 items); assessment tables/RLS; server-only test runtime (resume, no back, deadlines, writing/speaking uploads); student test/result pages; teacher results, rubric scoring, retakes, progress windows.
- Phase 5: learner profiles + onboarding wizard, groups/teams, `assign_lesson()` (targets → progress + notifications), recommendation engine (100%), lesson player + server-scored practice, bell, teacher assign/tracker/suggestions.
- Phase 6: rewards (rules with anti-gaming, levels, JSON badges, streak freeze, coins/shop with approvals, class/team leaderboards with teacher switch, Kagan improvement points, certificate PDFs); engines 100%.
- Phase 7: `mv_student_activity` + scoped functions (`class_stats`, `student_stats`, `class_cefr`, `class_skill_matrix`, `teacher_usage`, `school_averages`, `staff_last_seen`, `budget_stats`); coaches see classes in aggregate only; `coaching_logs`, `usage_counters`; 16 widgets, `/[gate]/insights` drill-down, coaching log, supervision tree, CSV export, print-to-PDF dashboards.
- Phase 8: report queue (dedupe keys, SKIP LOCKED), reports/email_log (one send per report), tick ≤ 20 jobs/50 s, 90/day email guard with priority + deferral, PDFs to Drive, responses archive, mail adapters, react-email digest, cron route + vercel.json + GitHub tick/backup workflows, `reports:dry-run`, report archive UI.
- Phase 9: nonce CSP + strict headers (`src/proxy.ts`), DB rate limits, student export/erase (PDPL), RLS sweep test, translated 404/error pages, axe WCAG A/AA e2e, Lighthouse ≥ 90, `docs/RUNBOOK.md`, `test:smoke`, `lighthouse`.

## Next
- STEP pack: 5,110 MCQs (161 passages, 316 audio tracks) converted and validated locally; B2+ stored as CEFR C1. Loads once Drive is connected. First real import: read the preview carefully — Google Sheets may reformat numbers/TRUE/dates (the local trial used CSV files).
- Known gaps left by the review (none blocks launch): entitlement checks are not called anywhere (rule 7; no effect while billing is off); Owner insights has no school picker; Visibility Studio can't pick `department.*` keys from a list; monthly reports show last-7-day activity (now labelled so); growth mixes departments for learners placed in two; listening time limits are enforced in the browser only; calibration has no screen.
- Real placement needs ~150+ items per department.

## Decisions (with one-line reasons)
- `src/lib/supabase/batch.ts`: large banks — reads page by key (API caps 1000 rows; offsets hit the 8 s timeout under RLS), `.in()` filters in batches of 100 (URI length). Used by content import and the placement pool.
- Gate entry = permission `gate:<key>` (rule 2: no role names); Owner controls it in the Roles matrix. Gate perms are exempt from the anti-escalation check (no data access).
- Gate list is a generated file: Next.js can't discover files at runtime; `gen:gate` rewrites it.
- Visibility precedence is computed in TS from rules SQL returns per user (users never read others' rules).
- School colour overrides staff gates only; the student gate keeps its playful palette.
- Phase 1 decisions: cacheComponents off; catalogue in migrations; login cards via browser print; `z.guid()` for ids.
- Media proxy sends `Cache-Control: public, immutable` (SPEC §5): content media only, random ids; student uploads (Phase 4) will be private.
- Placement runtime uses the service-role client only after the ownership + `placement:take` check (RLS hides answer keys from students).
- Tracker updates on refresh (revalidatePath), not live: Supabase Realtime is off to stay in the free tier.
- Lesson/assignment progress is written by the server (service role) after `learning:self` + lesson visibility checks; practice answers are scored server-side.
- A blocked reward event is still recorded with 0 XP so badges like "first lesson" count real activity, not XP.
- Dashboard PDF = browser print (Arabic shaping/RTL correct, data tables printed open); react-pdf stays for certificates. frontend-design plugin not available here: layouts follow SPEC §16 tokens.
- Teacher usage is listed for direct supervisees, or all teachers for `supervision:manage` (principal) — no role checks.
- Dashboard PDFs print from the browser; report PDFs (react-pdf) go to Drive. `npm run tick` calls the running app's endpoint (react-pdf can't load outside Next).
- Phase 9: every page renders dynamically (layout reads the CSP nonce); only client-used message namespaces go to the browser (`src/i18n/client-namespaces.ts`, test-guarded); Plex Arabic trimmed to 400/700, Inter not preloaded. Dep: `@axe-core/playwright` (dev, a11y). Lighthouse runs via `npx lighthouse@12.8.2` (not installed).
- Phase 3 deps: `@googleapis/drive`, `@googleapis/sheets`, `google-auth-library` (official, ~1/20 of `googleapis`); `tsx` (dev) runs scripts that import app code · Phase 4 dep: `@vitest/coverage-v8` (enforces 100% engine coverage) · Phase 6 deps: `@react-pdf/renderer` (in the stack; certificates), `arabic-persian-reshaper` (MIT; react-pdf doesn't join Arabic letters). Certificate font Noto Naskh Arabic loaded from fonts.gstatic.com · Phase 8 deps: `@react-email/components` (digest templates, SPEC), `use-intl` (pinned to next-intl's; React-free translator for the scheduler). Resend/Gmail via plain HTTP (no SDKs).
- Deps: none new in Phases 2, 5, 7 or the review. Scripts are `.mts` (Node runs TypeScript directly).
- Review: feature = on unless a flag row turns it off or limits it; days are school-time days (`DEFAULT_TIMEZONE`), weekend = the two days before `week_start`; `ENCRYPTION_KEY` now also keys student PINs (never rotate without new login cards); e2e runs serially (shared seed + one sign-in email per person).

## Open questions for the Owner
- Google Cloud: is the consent screen "In production"? In "Testing" the Drive connection ends every 7 days (RUNBOOK §3).
- Speaking placement needs Drive: keep it off (Visibility Studio → Feature flags) until Drive is connected?
- Is the GitHub repository public? Scheduled workflows on public repos stop after 60 days without commits.
