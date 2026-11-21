# PROGRESS (Claude Code updates this at the end of every session — keep ≤ 60 lines total)

## Current phase
Phase 2 — done (2026-11-22). Next: Phase 3. Code: github.com/mrwaleedyoussif/From-Zero-2-HeroEnglish (CI green).

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

## Next
- Phase 3 (Google Drive & content pipeline). Needs from Owner: Google Cloud OAuth client (Drive + Sheets API, consent screen "In production").

## Decisions (with one-line reasons)
- Gate entry = permission `gate:<key>` (rule 2: no role names); Owner controls it in the Roles matrix. Gate perms are exempt from the anti-escalation check (no data access).
- Gate list is a generated file: Next.js can't discover files at runtime; `gen:gate` rewrites it.
- Visibility precedence is computed in TS from rules SQL returns per user (users never read others' rules).
- School colour overrides staff gates only; the student gate keeps its playful palette.
- Phase 1 decisions: cacheComponents off; catalogue in migrations; login cards via browser print; `z.guid()` for ids.
- Deps: none new in Phase 2. Scripts are `.mts` (Node runs TypeScript directly).

## Open questions for the Owner
- `.env.example` is still blocked by `.claude/settings.json` (deny `./.env.*`); draft ready.
- Hosted Supabase: create project, set SMTP = Resend, enable Google, set Site URL; run migrations + `owner:create`.
