# LinguaPath — English Learning Platform (working name; rename freely)

Multi-role web app for English learning in schools. The **Owner** (super admin) controls users, permissions, gates and visibility.
- Full spec: `docs/SPEC.md` — read ONLY the section(s) the current phase names.
- Status & handoff: `docs/PROGRESS.md` — read FIRST every session, update LAST.
- Content import formats: `docs/DATA_TEMPLATES.md`.

## Stack (fixed — ask before changing)
- TypeScript (strict) · Next.js App Router · Server Components + Server Actions · Node runtime
- Supabase: Postgres + Auth + Row Level Security. SQL migrations in `supabase/migrations/`. Generated types in `src/types/db.ts`.
- Google Drive + Sheets API (`googleapis`): content library, media, uploads, report archive, backups. Auth = Owner OAuth refresh token (env). Never a service account on a personal Drive.
- Tailwind + shadcn/ui. Add components with `npx shadcn@latest add <name>` — never hand-write them.
- Zod at every input boundary · next-intl (en, ar + RTL) · Resend (via `lib/mail`) · @react-pdf/renderer
- Vitest (unit) · Playwright (e2e smoke)
- Vercel hosting. Scheduler: Vercel Cron (daily) + GitHub Actions schedule → `POST /api/cron/tick` (secret header).

## Commands
`npm run dev | build | lint | typecheck | test | test:db | test:e2e | db:start | db:migrate | db:types | db:seed | db:reset | owner:create | gen:gate <name> | drive:init | test:coverage | sim:placement | calibrate | reports:dry-run | tick | backup:upload | test:smoke | lighthouse`
(`test:db` = RLS/permission tests; needs `npm run db:start && npm run db:reset` first.)

## Architecture rules (non-negotiable)
1. Authorize twice: RLS in DB **and** `can(user, perm, scope)` (`src/lib/auth/can.ts`) in every server action/route. Never trust the client.
2. No role-name checks in UI or business code. Use permissions: `<Can perm="...">`, `isVisible(key)`, `hasEntitlement(key)`.
3. Every module/page/widget/nav item has a stable key in `src/lib/registry.ts`. Visibility, entitlements and gates reference keys only.
4. Gates (role portals) are config-driven: `src/app/[locale]/(gates)/<gate>/` + `src/gates/<gate>.config.ts`. Adding a gate must not touch other gates.
5. External services only behind adapters: `lib/storage` (Drive), `lib/mail`, `lib/billing`, `lib/scheduler`, `lib/ai` (stub).
6. Content is data. Never hard-code lessons, questions, badges, levels, cut scores.
7. `BILLING_ENABLED=false`. Entitlement checks still run; the free plan grants everything.
8. Secrets only in server files (`import 'server-only'`). `.env*` is never read or printed.
9. All UI strings via next-intl. Layouts must work in RTL.
10. Free-tier budget is a design constraint (SPEC §12): DB ≤ 500 MB, email ≤ 100/day, daily cron.
11. Write an `audit_log` row for every permission, visibility, role, grade or billing change.

## Code style
- Feature folders: `src/features/<feature>/{components,actions.ts,queries.ts,schema.ts,*.test.ts}`.
- Files < 200 lines. Named exports (except Next.js pages/layouts). No `any`.
- New dependency → one-line reason in PROGRESS.md "Decisions".

## Token economy (how to work)
- Read PROGRESS.md, then only the SPEC section for this phase. Don't scan the repo; use the Explore subagent for wide searches.
- Library docs: use context7 MCP, not web search. DB inspection: Supabase MCP (read-only).
- Don't echo whole files or long explanations. Report: what changed (paths), what's next, blockers.
- Prefer generators/CLIs (shadcn, supabase gen types) over hand-written boilerplate.
- Done = `npm run typecheck && npm run lint && npm run test` green.
- End of session: update PROGRESS.md in ≤ 15 lines (Done / Next / Decisions / Open questions for Owner).
