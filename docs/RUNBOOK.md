# LinguaPath — Owner runbook

Plain steps to put LinguaPath online and keep it healthy. Every service below has a free plan.
Do the sections in order the first time. You need about 1–2 hours.

---

## 1. Accounts you need (all free)

| Service | What it is for | Sign up |
|---|---|---|
| GitHub | The code (you already have it: `mrwaleedyoussif/From-Zero-2-HeroEnglish`) | github.com |
| Supabase | Database, sign-in | supabase.com |
| Vercel | Runs the website | vercel.com (sign in with GitHub) |
| Google Cloud | Lets the app use your Google Drive / Sheets | console.cloud.google.com |
| Resend | Sends the weekly report emails (100/day free) | resend.com |
| A domain | Your web address, e.g. `linguapath.school` | any registrar |

> Vercel's free (Hobby) plan is for non-commercial use. Switch to Vercel Pro before you charge schools (SPEC §13).

## 2. Database (Supabase)

1. Create a project. Region: **Frankfurt (eu-central-1)** or **Mumbai (ap-south-1)** — close to Saudi Arabia.
2. Project Settings → API: copy the **Project URL**, the **anon key** and the **service_role key**.
   Project Settings → Database → Connection string (URI): copy it as **SUPABASE_DB_URL** (for backups).
3. Put the tables in (from a computer with the code, or ask Claude Code to do it):
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   This creates every table and the default reference data only — **no demo schools or people**.
   Run the same `npx supabase db push` again after any update that adds a file to
   `supabase/migrations/` — **before** the update goes live on Vercel (merge to `main`).
4. Authentication → URL configuration: **Site URL** = `https://<your domain>`; add
   `https://<your domain>/auth/callback` to **Redirect URLs**.
5. Authentication → SMTP: use Resend's SMTP details (so sign-in emails come from your domain).
6. Authentication → Providers → Google: optional (staff "Sign in with Google").
7. Authentication → Sign In / Providers: switch **Allow new users to sign up** off. Accounts only
   come from your invitations and imports; this stops strangers creating empty accounts.
8. Authentication → Rate Limits: set **sign-ups and sign-ins** to at least **300 per 5 minutes**.
   Every student signs in through the website's servers, so Supabase sees all schools as a few
   addresses; the default (30) would lock a class out. The app keeps its own limit per student.

## 3. Google (Drive and Sheets)

1. In Google Cloud, create a project → APIs & Services → enable **Google Drive API** and **Google Sheets API**
   (and **Gmail API** only if you want report emails sent from your Gmail instead of Resend).
2. OAuth consent screen (Audience): External, then press **Publish app** so it is "In production".
   Left in "Testing", Google ends the Drive connection every 7 days.
3. Credentials → Create OAuth client ID → Web application. Authorised redirect URI:
   `https://<your domain>/api/integrations/google/callback`
4. Copy the **client ID** and **client secret**.

## 4. Website (Vercel)

1. Vercel → Add New → Project → import the GitHub repository. Framework: Next.js (automatic).
2. Settings → Environment Variables (Production). Make long random secrets with `openssl rand -base64 32`.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://<your domain>` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (secret!) |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` — **set once, never change**: it protects the Drive connection and every student PIN (a new key means reconnecting Drive and printing new login cards) |
| `CRON_SECRET` | `openssl rand -base64 32` (at least 32 characters) |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | from step 3 |
| `STORAGE_DRIVER` | `google` |
| `MAIL_PROVIDER` | `resend` (or `gmail`, or `console` to only log) |
| `RESEND_API_KEY` | Resend → API keys |
| `MAIL_FROM` | e.g. `LinguaPath <reports@your-domain>` (domain verified in Resend) |
| `EMAIL_DAILY_BUDGET` | `90` |
| `DEFAULT_TIMEZONE` | `Asia/Riyadh` |
| `BILLING_ENABLED` / `AI_ENABLED` | `false` |

   Never set `RATE_LIMIT_MULTIPLIER` in production (it is only for automated tests).
3. Deploy. Then Settings → Domains → add your domain and follow the DNS instructions at your registrar.
4. The daily scheduler (`vercel.json`) starts by itself.

## 5. GitHub automation (scheduler every 15 min + nightly backup)

Repository → Settings → Secrets and variables → Actions:
- **Variables**: `APP_URL` = `https://<your domain>`
- **Secrets**: `CRON_SECRET`, `SUPABASE_DB_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
  (same values as in Vercel).

Until `APP_URL` is set, both workflows stay switched off.

## 6. First sign-in

1. Create your Owner account (once):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run owner:create -- --email you@example.com --name "Your Name"
   ```
2. Open `https://<your domain>/en/login`, enter that email, click the link in the email.
3. Owner console → **Integrations** → *Connect Google* → *Create Drive folders* (makes `LinguaPath/00_Config … 06_Backups`).
4. Put your content sheets (Departments, Skills, Passages, Questions, Lessons, CutScores, Badges — see
   `docs/DATA_TEMPLATES.md`) in `LinguaPath/01_Content` and media in `02_Media`, then **Content → Check sheets → Apply**.
5. **Schools** → add your school, year, grades and classes; **Users** → invite staff, import students
   (CSV), print login cards.

## 6b. General learners (people outside a school) — optional

They join and sign in with a one-time code sent to their email: no password. **You decide who gets
in:** a person with one of your invitation codes starts at once; anyone else waits for your approval.
Off until you turn it on.

1. Database: apply `supabase/migrations/20261201000001_general_learners.sql` (`npx supabase db push`,
   or paste the file into Supabase → SQL Editor and add the line that records it:
   `insert into supabase_migrations.schema_migrations (version, name) values ('20261201000001', 'general_learners');`).
2. Email must really be sent: in Vercel set `MAIL_PROVIDER` to `resend` (with `RESEND_API_KEY` and a
   `MAIL_FROM` on a domain verified in Resend) or to `gmail`. With `console` the feature stays closed.
3. In Vercel add `GENERAL_LEARNERS_ENABLED` = `true`, and optionally `GENERAL_DAILY_SIGNUPS`
   (new learners allowed per day; 50 if not set). Redeploy.
4. Owner → **General learners**:
   - *Waiting for your approval*: **Approve** (they get an email and can sign in) or **Reject**
     (the request and the account are deleted).
   - *Invitation codes*: create a code for a group (what it is for, how many people, last day).
     Cancel a code at any time; people who already joined with it stay.
5. To pause sign-ups, set `GENERAL_LEARNERS_ENABLED` back to `false` and redeploy; existing learners
   keep their data. Adults only (they confirm they are 18 or older). Each learner is also listed under
   Owner → Users in the school **General learners**, where any account can be switched off.

## 7. Check that it works (smoke test)

From a computer with the code:
```bash
E2E_BASE_URL=https://<your domain> npm run test:smoke
```
All tests must pass (they only read public pages — nothing is created or changed).

## 8. Every week

- Owner home: **Free-tier budget** (database size warns at 400 of 500 MB; emails per day) and **Content health**.
- Owner → **Reports**: scheduler ticks, emails sent / waiting, failed jobs. "Run a tick now" retries straight away.
- Google Drive `06_Backups/db`: a new backup every night (last 30 kept).

## 9. When something goes wrong

| Problem | What to do |
|---|---|
| Nobody gets report emails | Owner → Reports: check failed jobs. Check `MAIL_PROVIDER`/`RESEND_API_KEY` in Vercel. |
| "Too many attempts" at sign-in | Wait 15 minutes (students) or 1 hour (staff links). Limits protect accounts. |
| Drive not connected | Owner → Integrations → Connect Google again. |
| Google shows "Error 401: invalid_client" on its own page | The **client ID** in Vercel is wrong or its client was deleted. Copy it again from Google Cloud → Clients (no quotes, no spaces), redeploy. |
| After Google's screen the app says the secret or redirect address was rejected | Do what the message says: new client secret → `GOOGLE_OAUTH_CLIENT_SECRET`, or add the exact redirect address shown on the Integrations page. Redeploy, connect again. |
| Students were given listening or speaking but there is no Drive yet | Owner → Visibility Studio → Feature flags → turn **Speaking placement** off until Drive is connected (recordings are stored there). |
| A whole class gets "Too many attempts" | Supabase → Authentication → Rate Limits: raise sign-ins (section 2, step 8). |
| A teacher needs a student's PIN | Teacher → Groups → the student → **Make a new PIN** (or the Owner prints new class cards). |
| Restore the database | Download the newest `db-YYYY-MM-DD.sql.gz` from Drive `06_Backups/db`, then `gunzip -c db-….sql.gz \| psql "$SUPABASE_DB_URL"` on a **new, empty** Supabase project, and point Vercel to it. |
| A family asks for their child's data / deletion (PDPL) | Owner → Users → the student → **Student data**: *Download all data* or *Erase this student* (recorded in the audit log). |
| The site is down | Vercel → Deployments: redeploy the last good one ("Promote to production"). |

## 10. Safe changes later

Use the small-change prompt at the end of `docs/PHASES.md`. Every change runs the same checks in GitHub (CI) before it ships.
