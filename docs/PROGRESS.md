# PROGRESS (Claude Code updates this at the end of every session — keep ≤ 60 lines total)

## Current phase
Phase 4 — done (2026-11-21). Next: Phase 5. Code: github.com/mrwaleedyoussif/From-Zero-2-HeroEnglish (CI green).

## Done
- Phase 0: Next 16 + Tailwind 4 + shadcn (RTL) + next-intl (en/ar), SPEC §16 tokens, Zod env, CI.
- Phase 1: Core + Access tables with RLS, `auth_can*()`, anti-escalation, audit triggers; staff magic link/Google, student PIN; `src/lib/auth/*` (engine mirrors SQL); Owner console (schools, users, CSV import, login cards, roles matrix, user detail, supervision, audit, view-as); demo seed; `owner:create`.
- Phase 2:
  - `src/lib/registry.ts`: 104 keys (gates, modules, pages, nav, widgets, features, limits) for all phases + en/ar labels (`Registry.*`).
  - Gates: `src/gates/<gate>.config.ts` × 5 (owner, leadership, coach, teacher, student) + generated `index.generated.ts`; shared `GateLayout`/`GateHome`/`WidgetSlot`; `/home` → best gate; switcher; planned widgets render "coming in phase N".
  - Visibility: SQL `visibility_rules_for(user)` + `feature_flags_for(user)`; pure `src/lib/visibility/engine.ts` (user > class > grade > school > role > plan > default, hide wins at a level, time windows); `isVisible`, `requireVisible`, `<Visible>`, `<Can>`, `<Entitled>`.
  - Owner: Visibility Studio (rules, who-sees tree, check a person, feature flags), Plans (entitlements, plan per school, free-until), school colour with WCAG check; free-period banner.
  - Billing: `plans`, `plan_entitlements`, `subscriptions`; `hasEntitlement()`/`limit()`; stub adapter `src/lib/billing/adapter.ts`; `BILLING_ENABLED=false` → free plan (`*`).
  - `npm run gen:gate <name>`: config + route + labels + permission migration + index (tested with "kiosk", then removed).
  - Tests: 87 unit, 23 DB, 9 Playwright (incl. acceptance: hide `widget.teacher.atRiskStudents` for 4A → gone for 4A teacher, shown for 4B teacher).

- Phase 3:
  - `src/lib/storage`: adapter interface; Google driver (`@googleapis/drive`+`sheets`, Owner refresh token, backoff); fake driver (local folder, same layout) for dev/tests; AES-GCM secret; `npm run drive:init` + Integrations button.
  - Owner Integrations page + OAuth start/callback (`/api/integrations/google/*`), token encrypted in `integration_secrets` (service role only).
  - Content tables + RLS (`auth_holds()`: students read lessons, never items/answers) + `import_jobs`.
  - Sheets import `src/features/content/import`: Zod per row → cross-sheet checks → diff → preview (row/column/reason) → apply (upsert by code, item versions, never delete) → media name→id via `media_assets`, missing-file report.
  - `/api/media/[id]`: permission + department visibility, Range, ETag, CDN cache, sandbox CSP. `/teacher/library` with filters.
  - Fixtures `supabase/fixtures/drive` = DATA_TEMPLATES samples. Tests: 114 unit, 28 DB, 10 e2e (acceptance in `e2e/content.spec.ts`).

- Phase 4:
  - Engine `src/features/placement/engine` (pure, 100% coverage enforced): Rasch, EAP (161-point grid), randomesque top-5 + skill balancing, stopping, scoring per item type, CEFR/scaled score, strengths/gaps, calibration stub (`npm run calibrate`).
  - `npm run sim:placement` (acceptance, in CI): population MAE 0.32, all learners 0.34, ≤ 25 items → PASS.
  - Assessment tables + RLS (students read own rows only, never write; staff via `placement:view_results`); blueprints per department; default CEFR rubric.
  - Runtime (server actions): start/resume, retake + cooldown, progress windows, answer (current item only, no back, server deadline), tab-switch counter, writing + speaking (Drive uploads, private `/api/uploads/[id]`).
  - Screens: student placement/test/result, `widget.student.placementCta`; teacher `/teacher/placement` (results, scoring queue, retake, progress check) + session detail (θ/SE path, rubric scoring).
  - Tests: 166 unit, 32 DB, 11 e2e (`e2e/placement.spec.ts`; run e2e with `--workers=1` after `db:reset`).

## Next
- Phase 5. Real placement needs ~150+ items per department (6 sample items only exercise the flow). Owner, for real Drive: Google Cloud OAuth client → `GOOGLE_OAUTH_CLIENT_ID/SECRET` → Owner → Integrations → Connect → Create Drive folders.

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
- Deps: none new in Phase 2. Scripts are `.mts` (Node runs TypeScript directly).

## Open questions for the Owner
- `.env.example` is still blocked by `.claude/settings.json` (deny `./.env.*`); draft ready.
- Hosted Supabase: create project, set SMTP = Resend, enable Google, set Site URL; run migrations + `owner:create`.
