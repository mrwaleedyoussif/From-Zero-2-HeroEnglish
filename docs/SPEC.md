# LinguaPath — Product & Technical Specification

> Claude Code: read only the sections your current phase lists. Section numbers are stable references.

---

## §1 Product summary & principles
An adaptive English-learning platform for schools (American-curriculum context, Saudi Arabia, English + Arabic UI).
- **Free now, paid later.** Billing is built in but switched off (§13).
- **Owner-controlled.** One Owner account sets roles, permissions, gates and what each user sees (§3, §4).
- **Data-driven content.** The Owner prepares all content in Google Sheets + Drive; the app imports it (§6).
- **Adaptive.** Placement and practice adapt to the learner (§7, §8).
- **Supervision-first.** Principals, VPs and coaches monitor teachers; teachers monitor students (§11).
- **Reports go out automatically** weekly and monthly (§12).
- **Zero extra storage cost.** Free tiers + the Owner's Google Drive (§5).

## §2 Users, roles, hierarchy

### Org hierarchy
`Owner (platform) → School → Academic year → Grade → Class (section) → Student`
One Owner may run many schools. Every role assignment carries a **scope**: `platform | school | grade | class | self`.

### Default roles (editable by Owner; roles are data, not code)
| Key | Who | Default scope | Supervises |
|---|---|---|---|
| `owner` | Platform owner | platform | everyone |
| `principal` | School principal | school | VPs, academic VP, coaches, teachers |
| `academic_vp` | Academic vice principal | school | coaches, teachers, students (academic data) |
| `vp` | Vice principal | school or grade | teachers, students |
| `coach` | Academic coach | assigned teachers | teachers they support |
| `teacher` | Teacher | own classes | own students |
| `student` | Learner | self | — |
| `parent` | Guardian (**disabled in v1**, schema ready) | linked students | — |

### Supervision graph
Table `supervision_links(supervisor_id, supervisee_id, school_id, kind, active_from, active_to)`. Defaults are created from roles (e.g., a principal supervises all staff in their school) but the Owner or principal can add/remove links (e.g., coach X → teachers A, B, C). Dashboards and reports follow this graph, never hard-coded role logic.

### Accounts & sign-in
- Staff: email magic link + Google sign-in (Supabase Auth).
- Students: email optional. Young learners log in with **school code + username + password/PIN**; internally a synthetic email `username@<school_code>.students.local` is used. Teachers can reset student PINs.
- Bulk import of users from a Sheet/CSV (§6). Invites by email or printable class login cards (PDF).

## §3 Permissions model (RBAC + scopes + overrides)
- Permission string: `resource:action` e.g. `reports:view`, `students:edit`, `lessons:assign`, `visibility:manage`, `placement:retake`, `rewards:grant`.
- `roles` ↔ `role_permissions` (many-to-many). `user_roles(user_id, role_id, scope_type, scope_id)`.
- `user_permission_overrides(user_id, permission, effect: allow|deny, scope_type, scope_id, expires_at)` — deny wins.
- Resolution: **deny override > allow override > role permissions > nothing**. Scope must contain the target resource.
- `can(user, perm, target)` in `src/lib/auth/can.ts`, cached per request. Mirrored in RLS via SQL helper `auth_can(perm text, school uuid, class uuid)`.
- Owner console: **Roles & Permissions matrix** (roles × permissions checkboxes), **User detail** (roles, scopes, overrides, effective permissions preview), **"View as user"** (read-only impersonation, audited).
- Seed file `supabase/seed/permissions.sql` lists every permission with description, grouped by module.

## §4 Gates & visibility control ("control what is shown to whom")

### Gates (interfaces)
A **gate** is a portal with its own layout, nav, theme and home dashboard: `owner`, `leadership` (principal/VPs), `coach`, `teacher`, `student`. (Later: `parent`, `kiosk`.)
- Config file per gate: `src/gates/<gate>.config.ts` → `{ key, basePath, roles[], theme, nav: NavItem[], homeWidgets: WidgetKey[] }`.
- After login, the user lands on the highest-priority gate they can enter; a gate switcher appears if they have several.
- New gate = new config + route folder. No edits elsewhere. Provide `npm run gen:gate <name>` scaffold script.

### Registry
`src/lib/registry.ts` lists every **module, page, widget, nav item, feature, department and content collection** with a stable key (e.g., `widget.teacher.atRiskStudents`, `module.rewards.leaderboard`).

### Visibility rules
Table `visibility_rules(id, target_key, subject_type: plan|role|school|grade|class|user, subject_id, effect: show|hide, starts_at, ends_at, note)`.
- Precedence (most specific wins): **user > class > grade > school > role > plan > registry default**.
- `isVisible(key)` server helper + `<Visible k="...">` component. Hidden items are not rendered AND their server actions reject (unless `can` also allows — visibility is UX, permission is security).
- Owner console **Visibility Studio**: pick a key → see a tree of who sees it → toggle per subject; preview as any user.
- Also controls content: Owner can hide a department, a lesson collection or a test from chosen schools/classes/users.

### Feature flags
`feature_flags(key, enabled, rollout: all|list, subjects[])` for unfinished features. Same precedence engine.

### Theming
Design tokens as CSS variables (§16). Per-school brand override (logo, primary colour) stored in `schools.theme` JSON. Student gate uses the playful token set.

## §5 Storage split — what lives where

**Google Drive is not used as a database** (no queries, no row-level security, slow, strict rate limits). It is the content library, file store and archive. Operational data lives in Supabase free Postgres.

| Data | Where | Why |
|---|---|---|
| Users, roles, permissions, classes, enrolments | Supabase | Joins, RLS, auth |
| Test sessions, responses, ability estimates, progress, XP | Supabase | Fast reads for dashboards |
| Lessons/questions metadata (imported) | Supabase | Adaptive selection needs SQL |
| Owner-authored content sheets | **Drive** (Sheets) | Owner edits there; app syncs |
| Media: audio, images, video, worksheets | **Drive** | Free storage |
| Student uploads: speaking audio, writing files | **Drive** | Keeps DB small |
| Weekly/monthly report PDFs | **Drive** | Archive |
| Raw responses older than 6 months | **Drive** (CSV.gz), aggregates stay in DB | 500 MB budget |
| Nightly DB backup (pg_dump) | **Drive** | Supabase free has no automatic backups |

### Drive folder layout (created by `npm run drive:init`)
```
/LinguaPath/
  00_Config/
  01_Content/      Departments, Skills, Questions, Passages, Lessons, Badges, CutScores (Google Sheets)
  02_Media/        audio/ images/ video/ docs/
  03_Uploads/      {school}/{year}/speaking/  {school}/{year}/writing/
  04_Reports/      {school}/{yyyy}/{mm}/
  05_Archive/      responses/{yyyy}/
  06_Backups/      db/
```

### Drive access
- Google Cloud project → enable Drive API + Sheets API → OAuth client (Web) → consent screen **published "In production"** (Testing mode refresh tokens expire after 7 days).
- One-time Owner connect flow at `/owner/integrations/google` stores the refresh token encrypted in DB (`integration_secrets`, AES-GCM with `ENCRYPTION_KEY` env).
- Scopes: `drive` (full; needed to read Owner-prepared files) + `spreadsheets.readonly`.
- If the Owner later has Google Workspace: optional Shared Drive + service account (adapter supports both).
- Media delivery: `GET /api/media/[fileId]` streams from Drive with `Cache-Control: public, max-age=31536000, immutable` so Vercel's CDN caches it; checks visibility first. Large video → store as unlisted YouTube/Vimeo link instead (column `content_link`).
- Respect Drive quotas: exponential backoff, batch metadata calls, cache file IDs in `media_assets`.

## §6 Content model & import
The Owner prepares everything (formats in `docs/DATA_TEMPLATES.md`).
- **Departments** = configurable tracks: e.g., General English, MAP Growth Prep (Reading, Language Usage), SAT Reading & Writing, IELTS Academic/General, GAT Verbal. Each department has **skills** (Reading, Listening, Grammar, Vocabulary, Writing, Speaking, or exam-specific strands) and a **placement blueprint**.
- **Items** (questions), **passages** (shared stimuli), **lessons**, **badges**, **CEFR cut scores**.
- **Import flow** (`/owner/content/sync`): read Sheets → validate each row with Zod → show a diff (new / changed / unchanged / errors with row number and reason) → Owner clicks Apply → upsert by stable IDs → log `import_jobs`. Never delete; set `status=retired`.
- Media references use the Drive **file name**; the importer resolves to file IDs and reports missing files.
- Content versioning: `items.version`; responses store the version answered.

## §7 Adaptive placement engine (CAT)
One placement test per department; each skill gets a sub-estimate.

**Model:** Rasch (1-parameter IRT). P(correct) = 1 / (1 + e^-(θ − b)).
- Owner gives difficulty 1–10 → initial `b = (d − 5.5) × 0.6` (≈ −2.7 … +2.7 logits). Calibrated `b` replaces it later.
- **Start:** θ₀ from grade band prior (table `ability_priors`), or teacher-set, or last estimate.
- **Item selection:** eligible = active, in department, visible to learner, matches blueprint skill quota, not seen in last 180 days, grade-band appropriate. Pick the item with |b − θ̂| smallest; **randomesque**: random among the 5 closest (exposure control). Content balancing: rotate skills to meet blueprint minimums.
- **Update after each answer:** EAP estimate on grid θ ∈ [−4, 4] step 0.05 with Normal(θ₀, 1) prior → θ̂ = posterior mean, SE = posterior SD. Correct answers push θ̂ (and next items) up; incorrect push down — that is the "harder when right, easier when wrong" behaviour, done properly.
- **Stop:** SE ≤ 0.35 and ≥ 12 items, OR 30 items, OR time limit. Configurable per department.
- **Output:** θ̂, SE, internal scaled score `round(200 + 20·θ̂)` (labelled "LinguaPath Scale", *not* NWEA RIT), CEFR band from `cut_scores`, per-skill θ̂ (with wider SE), strengths/gaps, recommended starting lessons.
- **Productive skills:** Writing and Speaking placement = level-tagged prompts; student types text or records audio (MediaRecorder → upload to Drive). Teacher scores with a CEFR-aligned rubric (`rubrics` table). Result merges into the learner profile. Hook for future AI pre-scoring via `lib/ai` (off).
- **Integrity:** one item per screen, no back navigation, per-item timing, tab-switch counter, retake policy (cooldown days, requires `placement:retake` by teacher).
- **Progress checks:** same engine, shorter (10–15 items), schedulable monthly per class → growth charts.
- **Calibration job (monthly):** for items with ≥ 200 responses, re-estimate `b` (JMLE or conditional ML), flag misfit (infit/outfit outside 0.7–1.3) and items with p-value < 0.1 or > 0.95 for Owner review.
- Engine is pure TypeScript in `src/features/placement/engine/` with 100% unit-test coverage (selection, EAP, stopping, balancing). Seeded random generator for reproducible tests.

## §8 Learner profile & personalisation
`learner_profiles`: CEFR per department & skill, θ̂ history, interests & hobbies (tags: football, gaming, art, science, music, travel…), goals (exam, school, fun), preferred formats (video, audio, reading, games, hands-on), mindset survey score (short growth-mindset questionnaire), language background, accommodations (extra time, audio support, dyslexia-friendly font).
- Onboarding wizard for students (visual, short, bilingual), editable later; teacher can view/annotate.
- **Learning "styles" are stored as format preferences** to vary content, not as diagnostic labels (the evidence for learning-style matching is weak). Recommendations always mix formats.
- **Recommendation engine (rules first, simple scoring):** score = gap weight (skills below target) + level fit (|lesson level − learner level|) + interest tag overlap + format preference + novelty − recent repetition. Teacher-assigned work always ranks first.

## §9 Lessons, assignments, recommendations
- **Lesson player:** renders lesson by `format` (Drive doc/PDF viewer, audio, video link, reading + questions, interactive practice set, game). Ends with a short practice check (adaptive within the lesson level).
- **Teacher recommends / assigns:** pick lessons (filter by department, skill, CEFR, tags, or "suggested for this student") → target: student(s), group, team, whole class → due date, note, required/optional → student gets in-app notification + item in "From my teacher" queue.
- **Smart suggestions for teachers:** "These 6 students are weak in past-tense grammar → suggested lessons" — teacher approves with one click.
- **Groups:** teacher-defined flexible groups (by level or interest) and Kagan-style **teams of 4** (§10).
- Progress tracking per assignment: not started / in progress / done / overdue, score, time spent.

## §10 Rewards system
All rules are data (`reward_rules`, `badges`) so the Owner can tune them.
- **XP** for: lesson completed (base × level multiplier), practice accuracy bonus, assignment on time, placement/progress check completed, streak days, teacher kudos (capped per day), team challenges.
- **Anti-gaming:** XP only if minimum time-on-task and minimum accuracy met; daily XP cap per activity type.
- **Levels:** XP thresholds (curve in `levels` table) with level names (e.g., Explorer → Voyager → Navigator → Captain → Legend).
- **Badges:** JSON rule conditions (event type, count, time window, accuracy), e.g., "5 listening lessons in a week", "first B1 placement", "30-day streak".
- **Streaks:** daily activity streak; one "freeze" per week.
- **Coins:** earned with XP; spend on avatar items/themes (cosmetic) or school-defined real rewards (certificate, class privilege) that need teacher approval.
- **Leaderboards:** class and team only, weekly reset, show top 10 + own rank, never bottom ranks. Teachers can switch off per class; Owner can hide via visibility.
- **Kagan teams:** team points = sum of members' **improvement** (not raw scores) so every member contributes; team challenges (e.g., RallyCoach-style pair tasks, Numbered Heads review quizzes) award team XP.
- **Certificates:** auto-generated PDF on level-up / CEFR milestone.

## §11 Supervision & dashboards
Each gate's home dashboard is a grid of registry widgets (visibility-controlled).
- **Teacher:** class roster with CEFR & θ trend, at-risk list (inactive 7 days, falling accuracy, overdue work), assignment tracker, skill heat-map, suggested groups, quick actions (assign, kudos, reset PIN, message).
- **Coach:** teachers they support → class engagement, assignment usage, growth vs. school average; **coaching log** (observation/walkthrough form with rubric, notes, agreed actions, follow-up date).
- **VP / Academic VP:** grade and class comparisons, placement distribution by CEFR, growth, engagement, teachers' platform usage, students needing intervention.
- **Principal:** school overview, trends, staff supervision tree (who supervises whom, last activity), coaching activity, report archive.
- **Owner:** all schools, usage, free-tier budget meters (DB size, emails sent today, Drive calls), content health (misfitting items), audit log.
- All charts: accessible, colour-blind-safe palette, data tables available behind each chart. Drill-down: school → grade → class → student.
- Exports: CSV for any table; PDF for dashboards.

## §12 Reports & notifications (free-tier aware)

### Schedule
- Weekly report: first day of the school week (default **Sunday 06:00 Asia/Riyadh**; per-school timezone and week start).
- Monthly report: first school day of the month.
- Optional term report.

### Content
- **Teacher:** class summary, top improvers, at-risk students, assignment completion, skill gaps, suggested actions for next week.
- **Coach:** each supported teacher's class metrics, usage, coaching log follow-ups due.
- **Principal / VPs:** school roll-up by grade/class/teacher, CEFR distribution change, engagement, supervision activity.
- Recipients come from permission `reports:receive:<weekly|monthly>` + supervision graph + per-user opt-out.

### Delivery
1. In-app report page (always; the source of truth).
2. One short **digest email** per recipient per period: key numbers + "Open full report" link (no attachments).
3. PDF archived to Drive `04_Reports/{school}/{yyyy}/{mm}/`.

### Free-tier mechanics
- Jobs go into `report_jobs` (status queued/running/done/failed, attempts). `POST /api/cron/tick` processes small batches (≤ 20 jobs, ≤ 50 s) and is idempotent.
- Triggers: Vercel Cron once daily **and** a GitHub Actions workflow every 15 minutes (free) calling the tick endpoint with `CRON_SECRET`.
- **Email budget guard:** `email_log` counts today's sends; stop at 90/day (Resend free = 100/day), defer the rest to the next day, priority principal > VPs > coaches > teachers. Mail adapter also supports Gmail API (Owner's account) as an alternative provider.
- The daily tick also touches the DB, which keeps the Supabase free project from pausing for inactivity.
- **DB budget guard:** monthly job archives responses older than 6 months to Drive as CSV.gz and keeps per-student/per-skill aggregates. Owner dashboard shows DB size; warn at 400 MB.
- Nightly GitHub Action: `pg_dump` → gzip → upload to Drive `06_Backups/db/` (keep last 30).

### In-app notifications
Bell + list: new assignment, due soon, badge earned, report ready, kudos. Optional web push later.

## §13 Plans & billing readiness
- Tables: `plans` (free, school_basic, school_pro, …), `plan_entitlements(plan_id, key, limit)`, `subscriptions(school_id, plan_id, status, trial_ends_at, current_period_end, provider, provider_ref)`.
- `hasEntitlement(key)` and `limit(key)` helpers used by modules (e.g., max students, AI scoring, advanced reports). With `BILLING_ENABLED=false`, every school is on `free` with all entitlements.
- `lib/billing` adapter interface: `createCheckout`, `handleWebhook`, `cancel`, `portalUrl`. Stub provider now. Real provider chosen later (Stripe, Paddle, Lemon Squeezy, or a regional gateway such as Moyasar or Tap, depending on where the business is registered).
- Owner console: plan editor, assign plan per school, "free until" date per school, banner when a free period ends.
- Note: Vercel Hobby is for non-commercial use; switch the project to Vercel Pro before charging.

## §14 Data model (tables)
Core: `schools`, `academic_years`, `grades`, `classes`, `profiles`, `enrolments(student_id, class_id, year_id)`, `teaching_assignments(teacher_id, class_id)`.
Access: `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permission_overrides`, `supervision_links`, `visibility_rules`, `feature_flags`, `audit_log`.
Content: `departments`, `skills`, `items`, `item_options`, `passages`, `media_assets`, `lessons`, `lesson_items`, `rubrics`, `cut_scores`, `ability_priors`, `import_jobs`.
Assessment: `test_blueprints`, `test_sessions`, `responses`, `ability_estimates`, `productive_submissions`, `submission_scores`.
Learning: `learner_profiles`, `assignments`, `assignment_targets`, `assignment_progress`, `lesson_progress`, `recommendations`, `groups`, `teams`, `team_members`.
Rewards: `xp_events`, `levels`, `badges`, `user_badges`, `streaks`, `coin_ledger`, `reward_catalog`, `redemptions`.
Supervision: `coaching_logs`, `observations`.
Reports: `report_jobs`, `reports`, `email_log`, `notifications`.
Billing: `plans`, `plan_entitlements`, `subscriptions`.
System: `integration_secrets`, `settings`, `archive_manifests`.
Every table: `id uuid pk`, `created_at`, `updated_at`, `school_id` where relevant (for RLS), soft-delete via `status` where relevant. Index all foreign keys and dashboard filters.

## §15 Security & privacy (minors' data)
- RLS on every table; default deny. Tests prove a teacher cannot read another school's students.
- Least-privilege service role used only in cron/import routes.
- PII minimised; students' surnames optional. Uploaded media in private Drive folders, served only via the permission-checked proxy.
- Rate limiting on auth and public routes. CSRF-safe server actions. Strict CSP headers.
- Audit log for sensitive actions; "View as user" audited.
- Data export & delete per student (Owner).
- Align with Saudi PDPL and school policy; parental consent flag on student records.

## §16 UI/UX & design tokens
- Mobile-first, works on school Chromebooks/iPads. WCAG 2.2 AA. Full RTL for Arabic.
- Fonts: Inter (Latin) + IBM Plex Sans Arabic (Arabic). Dyslexia-friendly option (Atkinson Hyperlegible).
- **Staff palette (calm, professional):** primary `#1E3A8A` (navy), primary-hover `#1E40AF`, secondary `#0F766E` (teal), accent `#F59E0B` (amber, rewards only, dark text on it), surface `#F8FAFC`, border `#E2E8F0`, text `#0F172A`, muted `#475569`, success `#15803D`, warning `#B45309`, danger `#B91C1C`, info `#0369A1`.
- **Student palette (bright, motivating):** primary `#6D28D9` (violet), secondary `#0EA5E9` (sky), accent `#F97316` (orange), success `#16A34A`, surface `#FFFBEB`.
- CEFR colour scale (sequential, colour-blind safe): Pre-A1 `#E0F2FE` · A1 `#BAE6FD` · A2 `#7DD3FC` · B1 `#38BDF8` · B2 `#0284C7` · C1 `#075985` · C2 `#0C4A6E`.
- Dark mode via the same tokens. Per-school override of `--primary` with automatic contrast check.

## §17 Out of scope for v1
Parent gate (schema only) · AI scoring (stub) · native mobile apps · live video classes · chat between students · real payments.
