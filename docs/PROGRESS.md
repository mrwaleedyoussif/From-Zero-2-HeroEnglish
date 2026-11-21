# PROGRESS (Claude Code updates this at the end of every session — keep ≤ 60 lines total)

## Current phase
Phase 0 — done (2026-11-21). Next: Phase 1.

## Done
- Phase 0: Next.js 16.4 (App Router, TS strict + noUncheckedIndexedAccess, src/), Tailwind 4, shadcn/ui (radix, RTL on), next-intl 4 (en/ar, `/[locale]` prefix always, `src/proxy.ts`), ESLint (no-explicit-any = error, 0 warnings), Prettier, Vitest (10 tests), Playwright smoke (5 tests).
- SPEC §16 tokens in `src/app/globals.css`: staff (default), `[data-theme="student"]`, `.dark`, CEFR scale, `--reward` (= SPEC amber accent), `[data-font="dyslexia"]`. Fonts: Inter, IBM Plex Sans Arabic, Atkinson Hyperlegible.
- Env: `src/lib/env.schema.ts` (Zod, tested) → `serverEnv()` (server-only, lazy) and `publicEnv()`.
- Skeleton: `src/app/[locale]/(gates)`, `src/gates`, `src/features`, `src/lib/{auth,storage,mail,billing,scheduler,ai}`, `src/lib/registry.ts` (empty, typed), `supabase/{config.toml,migrations,seed}`, `scripts/db-seed.sh`, `src/types/db.ts` placeholder.
- CI: `.github/workflows/ci.yml` (typecheck, lint, format:check, test, build). Screenshots in `docs/screenshots/`.

## Next
- Phase 1 (see docs/PHASES.md). Needs Docker for `npm run db:start` (local Supabase).

## Decisions (with one-line reasons)
- Stack fixed in CLAUDE.md.
- Gates live in `src/app/[locale]/(gates)/` (not `src/app/(gates)/`) so every gate is bilingual; CLAUDE.md updated.
- Kept Next 16 defaults `cacheComponents` + `partialPrefetching`; locale pages prerender statically via `generateStaticParams` + `setRequestLocale`.
- next-themes: light/dark class toggle without a flash on load (standard shadcn pairing).
- `cn` (shadcn's own package) replaces clsx + tailwind-merge — installed by shadcn init.
- @types/node 22 (matches Node 22 runtime; required by Vitest 5 peer range). @playwright/test pinned 1.63.0 (matches cloud browser).
- prettier-plugin-tailwindcss: consistent class order. supabase CLI as devDependency: same version for everyone.
- Owner docs (CLAUDE.md, START-HERE.md, docs/) excluded from Prettier to keep their formatting.
- Env: Google/Resend vars optional until their phases; Supabase, ENCRYPTION_KEY, CRON_SECRET required when server env is first used.

## Open questions for the Owner
- `.env.example` not created: `.claude/settings.json` denies `./.env.*`, which also blocks the example file. Allow it or add it yourself (draft ready).
- GitHub repo to push to (CI only runs once pushed).
