# PROGRESS (Claude Code updates this at the end of every session — keep ≤ 60 lines total)

## Current phase
Phase 9 — built; LIVE at https://zero-2-heroenglish.com (2026-11-22: Supabase `linguapath` eu-central-1, all migrations; Vercel project `linguapath`, auto-deploys from GitHub main; old GitHub Pages DNS removed; smoke checks pass). Waiting on: Owner email for `owner:create`, Resend SMTP, Google OAuth client. Code: github.com/mrwaleedyoussif/From-Zero-2-HeroEnglish (CI green).

## Done
- Phase 0: Next 16 + Tailwind 4 + shadcn (RTL) + next-intl (en/ar), SPEC §16 tokens, Zod env, CI.
- Phase 1: Core + Access tables with RLS, `auth_can*()`, anti-escalation, audit triggers; staff magic link/Google, student PIN; `src/lib/auth/*` (engine mirrors SQL); Owner console (schools, users, CSV import, login cards, roles matrix, user detail, supervision, audit, view-as); demo seed; `owner:create`.
- Phase 2: registry (`src/lib/registry.ts`, all keys + en/ar labels); config-driven gates × 5 + `gen:gate`; visibility engine (user > class > grade > school > role > plan) + Studio; plans/entitlements (`BILLING_ENABLED=false` → free `*`); school colour (WCAG).
- Phase 3: `lib/storage` (Google + fake drivers, Owner OAuth, AES-GCM secret, `drive:init`); content tables + RLS (learners never read items); Sheets import (validate → diff preview → apply, media by name, missing-file report); `/api/media/[id]`; `/teacher/library`.
- Phase 4: pure CAT engine (Rasch/EAP, balancing, stopping, scoring; 100% coverage) + `sim:placement` (MAE 0.32 ≤ 25 items); assessment tables/RLS; server-only test runtime (resume, no back, deadlines, writing/speaking uploads); student test/result pages; teacher results, rubric scoring, retakes, progress windows.
- Phase 5: learner profiles + onboarding wizard, groups/teams, `assign_lesson()` (targets → progress + notifications), recommendation engine (100%), lesson player + server-scored practice, bell, teacher assign/tracker/suggestions.
- Phase 6: rewards (rules with anti-gaming, levels, JSON badges, streak freeze, coins/shop with approvals, class/team leaderboards with teacher switch, Kagan improvement points, certificate PDFs); engines 100%.
- Phase 7:
  - SQL: `mv_student_activity` (materialized, refreshed when > 10 min old via `refresh_insights`, service role only) read only through scoped functions `class_stats`, `student_stats`, `class_cefr`, `class_skill_matrix`, `teacher_usage`, `school_averages`, `staff_last_seen`, `budget_stats`. Coaches see their teachers' classes in aggregate, never individual learners. `coaching_logs` (+ OBSERVATION rubric), `usage_counters` (Drive calls counted in `lib/storage`).
  - UI: 16 registry widgets across all gates; `/[gate]/insights` drill-down school → grade → class → student; `/coach/coaching-log`; `/leadership/supervision` tree; charts = CSS bars with SPEC tokens + data table; CSV `/api/export/[dataset]`; dashboards print to PDF.
  - Tests: 207 unit (analytics 100%), 44 DB, 16 e2e (`e2e/insights.spec.ts` scope acceptance).

- Phase 8: report queue (dedupe keys, SKIP LOCKED), reports/email_log (one send per report), tick ≤ 20 jobs/50 s, 90/day email guard with priority + deferral, PDFs to Drive, responses archive, mail adapters, react-email digest, cron route + vercel.json + GitHub tick/backup workflows, `reports:dry-run`, report archive UI.
- Phase 9:
  - Security: nonce CSP + strict headers in `src/proxy.ts` (`lib/security/headers.ts`), DB rate limits on PIN sign-in and magic links (`hit_rate_limit`), permission checks added to certificate/upload routes, student data export/erase for the Owner (PDPL, audited), Gmail send scope only when `MAIL_PROVIDER=gmail`.
  - Sweep DB test: RLS on every table, no cross-school rows in any `school_id` table, erase cascades, seed-free migrations.
  - UX: translated 404 (catch-all) + error/global-error pages, gate loading skeleton, axe WCAG A/AA e2e (0 violations en/ar), CEFR B2–C2 darkened for contrast, Lighthouse student pages ≥ 90 (median of 3, en + ar) after font + client-message trimming.
  - `docs/RUNBOOK.md`; `npm run test:smoke` (production-safe), `npm run lighthouse`. Tests: 222 unit, 51 DB, 25 e2e.

## Next
- STEP pack: 5,110 MCQs (Booklets 1–4 + vocabulary banks, 161 passages, 316 audio tracks) converted from the Owner's Drive and validated with the importer (local trial: import 25 s, 30-item placement OK). B2+ is stored as CEFR C1. Loads once the Owner connects Drive.
- Launch: Owner follows docs/RUNBOOK.md (Supabase project + `db push`, Google OAuth client, Vercel env + domain, GitHub `APP_URL`/secrets, Resend), then `E2E_BASE_URL=https://<domain> npm run test:smoke` = Phase 9 acceptance.
- Real placement needs ~150+ items per department (STEP item registers in the Owner's Drive could be converted).
- Owner's Drive (shared folder): ~1,360 mp3, 380 docx, STEP item registers (CSV) — not yet in the DATA_TEMPLATES sheet format; conversion is a separate task. Owner, for real Drive: Google Cloud OAuth client → `GOOGLE_OAUTH_CLIENT_ID/SECRET` → Owner → Integrations → Connect → Create Drive folders.

## Decisions (with one-line reasons)
- `src/lib/supabase/batch.ts`: large banks — reads page by key (API caps 1000 rows; offsets hit the 8 s timeout under RLS), `.in()` filters in batches of 100 (URI length). Used by content import and the placement pool.
- Gate entry = permission `gate:<key>` (rule 2: no role names); Owner controls it in the Roles matrix. Gate perms are exempt from the anti-escalation check (no data access).
- Gate list is a generated file: Next.js can't discover files at runtime; `gen:gate` rewrites it.
- Visibility precedence is computed in TS from rules SQL returns per user (users never read others' rules).
- School colour overrides staff gates only; the student gate keeps its playful palette.
- Phase 1 decisions: cacheComponents off; catalogue in migrations; login cards via browser print; `z.guid()` for ids.
- Phase 3 deps: `@googleapis/drive`, `@googleapis/sheets`, `google-auth-library` (official, ~1/20 of `googleapis`); `tsx` (dev) runs scripts that import app code.
- Media proxy sends `Cache-Control: public, immutable` (SPEC §5): content media only, random ids; student uploads (Phase 4) will be private.
- Badges sheet is imported in Phase 6 (badges table lives with Rewards).
- Placement runtime uses the service-role client only after the ownership + `placement:take` check (RLS hides answer keys from students).
- Sim pass = population and all-learner MAE < 0.4; ±2 logit groups sit at ~0.36–0.40 (prior shrinkage, reported honestly).
- Phase 4 dep: `@vitest/coverage-v8` (enforces 100% engine coverage).
- Tracker updates on refresh (revalidatePath), not live: Supabase Realtime is off to stay in the free tier.
- Lesson/assignment progress is written by the server (service role) after `learning:self` + lesson visibility checks; practice answers are scored server-side.
- Phase 6 deps: `@react-pdf/renderer` (in the stack; certificates), `arabic-persian-reshaper` (MIT; react-pdf doesn't join Arabic letters). Certificate font Noto Naskh Arabic loaded from fonts.gstatic.com.
- A blocked reward event is still recorded with 0 XP so badges like "first lesson" count real activity, not XP.
- Dashboard PDF = browser print (Arabic shaping/RTL correct, data tables printed open); react-pdf stays for certificates. frontend-design plugin not available here: layouts follow SPEC §16 tokens.
- Teacher usage is listed for direct supervisees, or all teachers for `supervision:manage` (principal) — no role checks.
- Phase 8 deps: `@react-email/components` (digest templates, SPEC), `use-intl` (pinned to next-intl's; React-free translator for the scheduler). Resend/Gmail via plain HTTP (no SDKs).
- Dashboard PDFs print from the browser; report PDFs (react-pdf) go to Drive. `npm run tick` calls the running app's endpoint (react-pdf can't load outside Next).
- Phase 9: every page renders dynamically (layout reads the CSP nonce); only client-used message namespaces go to the browser (`src/i18n/client-namespaces.ts`, test-guarded); Plex Arabic trimmed to 400/700, Inter not preloaded. Dep: `@axe-core/playwright` (dev, a11y). Lighthouse runs via `npx lighthouse@12.8.2` (not installed).
- Deps: none new in Phases 2, 5 and 7. Scripts are `.mts` (Node runs TypeScript directly).

## Open questions for the Owner
- Go-live accounts and settings: see docs/RUNBOOK.md §1–6 (Supabase, Google OAuth, Vercel + domain, GitHub automation, Resend).
- Drive content: map the STEP item registers / docx lessons into the Questions/Lessons sheets? (needs Owner's choice of departments, skills, CEFR mapping).
