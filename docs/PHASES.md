# Build phases — paste ONE phase per Claude Code session

How to use:
1. Start Claude Code in the project folder. Run `/clear` before every new phase.
2. Paste the phase prompt exactly. For phases marked **[PLAN]**, press Shift+Tab to enter plan mode first, approve the plan, then let it build.
3. When the phase reports "done", check the acceptance list yourself (2 minutes in the browser), then commit.
4. If a session gets long, run `/compact` and continue; never paste the whole spec into chat.

---

## Phase 0 — Scaffold & foundations [PLAN]
```
Read CLAUDE.md, docs/PROGRESS.md, and docs/SPEC.md §1, §5, §16 only.
Goal: create the project skeleton exactly per the stack in CLAUDE.md.
Do:
- Next.js (latest stable, App Router, TS strict, src/ dir), Tailwind, shadcn/ui init, next-intl with en + ar (RTL), ESLint + Prettier, Vitest, Playwright.
- Folder structure: src/app/(gates)/, src/gates/, src/features/, src/lib/{auth,storage,mail,billing,scheduler,ai,registry.ts}, supabase/migrations, supabase/seed, scripts/.
- Supabase local setup (CLI), env schema validated with Zod in src/lib/env.ts, .env.example with every variable documented.
- Design tokens from SPEC §16 as CSS variables (staff + student themes, dark mode).
- package.json scripts listed in CLAUDE.md.
- GitHub Actions: CI (typecheck, lint, test) on push.
- Create docs/PROGRESS.md entries.
Use context7 for current Next.js/Supabase/next-intl setup docs. Do not build features yet.
Acceptance: `npm run dev` shows a bilingual placeholder page that flips to RTL in Arabic; CI green.
```

## Phase 1 — Auth, org hierarchy, roles & permissions [PLAN]
```
Read PROGRESS.md and SPEC §2, §3, §14 (Core + Access tables), §15.
Build:
- Migrations for Core + Access tables with RLS (default deny) and SQL helper auth_can().
- Supabase Auth: staff magic link + Google; student login with school code + username + PIN (synthetic email).
- src/lib/auth/can.ts with scope resolution and override precedence; unit tests for every precedence case.
- Seed: permissions catalogue, default roles, one demo school, grades, 2 classes, 1 user per role, 20 students.
- Owner console pages: Schools, Users (bulk import from CSV, invites, printable class login cards), Roles & Permissions matrix, User detail with effective-permission preview, Supervision links editor, "View as user" (audited).
- audit_log writes.
Acceptance: RLS tests prove cross-school isolation; the Owner can grant a teacher an extra permission and see it take effect without redeploy.
```

## Phase 2 — Gates, registry, visibility & entitlements [PLAN]
```
Read PROGRESS.md and SPEC §4, §13.
Build:
- src/lib/registry.ts (keys for every planned module/page/widget/nav item).
- Gate config system + 5 gates (owner, leadership, coach, teacher, student) with layouts, nav from config, gate switcher, landing logic. Script `npm run gen:gate <name>`.
- Visibility engine (precedence user>class>grade>school>role>plan>default), <Visible>, isVisible(), server-side enforcement helper; feature flags.
- Owner "Visibility Studio": search a key, see who sees it, toggle per subject, preview-as-user.
- Plans & entitlements tables, hasEntitlement()/limit(), billing adapter stub, BILLING_ENABLED=false, plan editor, per-school "free until".
- Per-school theme override with contrast check.
Acceptance: hiding `widget.teacher.atRiskStudents` for one class removes it only for that class's teacher; a new gate can be added with the generator and no other file edits.
```

## Phase 3 — Google Drive & content pipeline
```
Read PROGRESS.md, SPEC §5, §6, and docs/DATA_TEMPLATES.md.
Build:
- lib/storage Drive adapter (Owner OAuth connect flow, encrypted refresh token, backoff, batch calls) + `npm run drive:init` folder creation.
- Content tables migration (Content section of §14).
- Sheets import: read → Zod validate → diff preview (new/changed/errors with row numbers) → apply → import_jobs log. Media name → file ID resolution with missing-file report.
- /api/media/[fileId] permission-checked streaming proxy with long cache headers.
- Lesson library browser for staff (filters: department, skill, CEFR, grade band, tags, format).
Acceptance: importing the sample sheets from DATA_TEMPLATES produces a clean diff; a broken row shows a clear error; media plays through the proxy.
```

## Phase 4 — Adaptive placement engine [PLAN]
```
Read PROGRESS.md and SPEC §7 only.
Build:
- Pure TS engine in src/features/placement/engine/: Rasch probability, EAP on grid, randomesque selection with blueprint balancing, stopping rules, scaled score, CEFR mapping. Seeded RNG. 100% unit-test coverage, including simulated learners (θ = −2, 0, +2) converging within SE ≤ 0.35.
- Assessment tables migration.
- Student test UI: one item per screen, timer, no back, audio items, tab-switch counter, resume after disconnect.
- Writing/Speaking prompts: text editor + MediaRecorder upload to Drive; teacher rubric scoring screen.
- Results page (student-friendly + teacher detailed), retake policy, progress-check mode, monthly calibration job stub.
Acceptance: simulation report printed by `npm run sim:placement` shows mean absolute error < 0.4 logits at ≤ 25 items.
```

## Phase 5 — Learner profile, lessons, assignments & recommendations
```
Read PROGRESS.md and SPEC §8, §9.
Build: student onboarding wizard (bilingual, visual), learner profile, lesson player by format, practice checks, teacher assign flow (student/group/team/class, due date, note), "From my teacher" queue, recommendation scoring service + teacher "suggested for these students" with one-click assign, groups & teams management, notifications.
Acceptance: a teacher assigns a lesson to a group; students see it; completion updates the teacher tracker in real time (or on refresh).
```

## Phase 6 — Rewards
```
Read PROGRESS.md and SPEC §10.
Build: reward rules engine (event → XP/coins with anti-gaming checks), levels, badge rule evaluator (JSON conditions), streaks with freeze, coin ledger & catalogue with teacher-approved redemptions, class/team leaderboards (top 10 + own rank, toggleable), Kagan team improvement points, certificate PDFs, celebratory but accessible UI (respect reduced motion).
Acceptance: unit tests for every rule type; a teacher can disable the leaderboard for a class.
```

## Phase 7 — Dashboards & supervision
```
Read PROGRESS.md and SPEC §11. Use the frontend-design plugin for layout quality; charts must use the SPEC §16 tokens.
Build all gate home dashboards from registry widgets, drill-down school→grade→class→student, coaching log & observation forms with rubric, supervision tree view, Owner budget meters, CSV/PDF export. Use SQL views/materialised aggregates for speed.
Acceptance: principal, coach and teacher demo users each see only their scope; every chart has a table fallback.
```

## Phase 8 — Reports, scheduler, archive & backups
```
Read PROGRESS.md and SPEC §12.
Build: lib/scheduler (report_jobs queue, idempotent /api/cron/tick with CRON_SECRET), vercel.json daily cron, GitHub Actions 15-min ticker, weekly/monthly report generators per role, react-email digest templates (en/ar), Resend + Gmail mail adapters with the 90/day budget guard and priority, PDF to Drive, in-app report archive, responses archiving to Drive, nightly pg_dump backup workflow.
Acceptance: `npm run reports:dry-run -- --week` prints who would receive what, the email count, and deferrals; running the tick twice never sends duplicates.
```

## Phase 9 — Hardening & launch
```
Read PROGRESS.md and SPEC §13, §15.
Do: security review (use the security-guidance and code-review plugins), RLS test sweep, rate limits, CSP, error pages, empty states, loading skeletons, accessibility pass (axe in Playwright), Arabic RTL pass, performance (Lighthouse ≥ 90 on student pages), seed-free production migration, Vercel deploy with custom domain, Owner runbook in docs/RUNBOOK.md.
Acceptance: Playwright smoke suite green on the production URL.
```

---

## Small-change prompt template (after launch)
```
Read PROGRESS.md and SPEC §<n>. Task: <one sentence>. Constraints: follow CLAUDE.md rules; touch only src/features/<x>. Done when: <test or visible behaviour>.
```
