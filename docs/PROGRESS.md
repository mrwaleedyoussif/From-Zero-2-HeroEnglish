# PROGRESS (Claude Code updates this at the end of every session — keep ≤ 60 lines total)

## Current phase
Phase 7 — done (2026-11-22). Next: Phase 8. Code: github.com/mrwaleedyoussif/From-Zero-2-HeroEnglish (CI green).

## Done
- Phase 0: Next 16 + Tailwind 4 + shadcn (RTL) + next-intl (en/ar), SPEC §16 tokens, Zod env, CI.
- Phase 1: Core + Access tables with RLS, `auth_can*()`, anti-escalation, audit triggers; staff magic link/Google, student PIN; `src/lib/auth/*` (engine mirrors SQL); Owner console (schools, users, CSV import, login cards, roles matrix, user detail, supervision, audit, view-as); demo seed; `owner:create`.
- Phase 2: registry (`src/lib/registry.ts`, all keys + en/ar labels); config-driven gates × 5 + `gen:gate`; visibility engine (user > class > grade > school > role > plan) + Studio; plans/entitlements (`BILLING_ENABLED=false` → free `*`); school colour (WCAG).
- Phase 3: `lib/storage` (Google + fake drivers, Owner OAuth, AES-GCM secret, `drive:init`); content tables + RLS (learners never read items); Sheets import (validate → diff preview → apply, media by name, missing-file report); `/api/media/[id]`; `/teacher/library`.
- Phase 4: pure CAT engine (Rasch/EAP, balancing, stopping, scoring; 100% coverage) + `sim:placement` (MAE 0.32 ≤ 25 items); assessment tables/RLS; server-only test runtime (resume, no back, deadlines, writing/speaking uploads); student test/result pages; teacher results, rubric scoring, retakes, progress windows.
- Phase 5:
  - Tables + RLS: learner_profiles/notes, groups/teams (+members, teams 3–5), assignments/targets/progress, lesson_progress, recommendations (daily cache), notifications (user may only set read_at), profile_options (wizard choices as data). `assign_lesson()` expands targets, creates progress + notifications in one tx.
  - Pure `recommend/` engine (gap + level fit + interests + format + novelty − repetition, format mix) and teacher `suggestGroups` — 100% coverage; `teams.ts` mixed-ability snake draft.
  - Student: onboarding wizard, profile, `/student/lessons` (From my teacher first, then suggestions), lesson player by format + server-scored practice check; bell in every gate; widgets fromMyTeacher/recommended.
  - Teacher: `/teacher/assignments` (assign to student/group/team/class, due, note, required; one-click suggestions; tracker), `/teacher/groups` (+ auto teams, learner page with notes); widgets tracker/suggestedGroups/quickActions.
  - Tests: 182 unit, 36 DB, 12 e2e (acceptance `e2e/learning.spec.ts`).

- Phase 6:
  - Tables + RLS: reward_rules, levels, badges/user_badges, xp_events (idempotent source_key), streaks, coin_ledger, reward_catalog, redemptions, certificates, class_reward_settings (audited), team_xp. Functions: `class_leaderboard`, `team_scores` (hidden from students when the class board is off), `redeem_item` (atomic balance check), `decide_redemption` (refund on reject).
  - Pure `rewards/engine` (100% coverage): rules (min time/accuracy, daily caps, level/accuracy scaling), levels, badge JSON rules, streaks with weekly freeze, top-10 + own rank (top half only), Kagan improvement points.
  - `award()` service hooked into lesson completion, placement/progress finish, kudos, team challenges; badges + level-ups notify; Badges sheet in the content import.
  - Screens: `/student/rewards`, celebration after lessons (motion-safe, aria-live), 3 student widgets; `/teacher/rewards` (leaderboard switch, kudos, team points, approvals); `/owner/rewards` (rules, levels, shop). Certificate PDFs `/api/certificates/[id]`.
  - Tests: 203 unit, 39 DB, 13 e2e (`e2e/rewards.spec.ts`).

- Phase 7:
  - SQL: `mv_student_activity` (materialized, refreshed when > 10 min old via `refresh_insights`, service role only) read only through scoped functions `class_stats`, `student_stats`, `class_cefr`, `class_skill_matrix`, `teacher_usage`, `school_averages`, `staff_last_seen`, `budget_stats`. Coaches see their teachers' classes in aggregate, never individual learners. `coaching_logs` (+ OBSERVATION rubric), `usage_counters` (Drive calls counted in `lib/storage`).
  - UI: 16 registry widgets across all gates; `/[gate]/insights` drill-down school → grade → class → student; `/coach/coaching-log`; `/leadership/supervision` tree; charts = CSS bars with SPEC tokens + data table; CSV `/api/export/[dataset]`; dashboards print to PDF.
  - Tests: 207 unit (analytics 100%), 44 DB, 16 e2e (`e2e/insights.spec.ts` scope acceptance).

## Next
- Phase 8 (reports, scheduler, archive, backups): call `refresh_insights` from the daily tick. Real placement needs ~150+ items per department.
- Owner's Drive (shared folder): ~1,360 mp3, 380 docx, STEP item registers (CSV) — not yet in the DATA_TEMPLATES sheet format; conversion is a separate task. Owner, for real Drive: Google Cloud OAuth client → `GOOGLE_OAUTH_CLIENT_ID/SECRET` → Owner → Integrations → Connect → Create Drive folders.

## Decisions (with one-line reasons)
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
- Deps: none new in Phases 2, 5 and 7. Scripts are `.mts` (Node runs TypeScript directly).

## Open questions for the Owner
- Hosted Supabase: create project, set SMTP = Resend, enable Google, set Site URL; run migrations + `owner:create`.
- Drive content: map the STEP item registers / docx lessons into the Questions/Lessons sheets? (needs Owner's choice of departments, skills, CEFR mapping).
