# START HERE — Owner setup guide (read once, ~30 minutes)

## 1. Recommended language & stack
**TypeScript end-to-end with Next.js on Vercel, Supabase (free Postgres + Auth), and your Google Drive for files.**
- One language for front end and back end → fewer moving parts and fewer tokens per change.
- Next.js is made by Vercel, so it deploys to your existing Vercel domain with zero config.
- TypeScript's type checker catches mistakes before they run → fewer fix-and-retry loops with Claude Code.
- Supabase gives login, roles-safe data access (Row Level Security) and a real database free → far less code than building auth yourself.
- Python (Django) or Java (Spring) would need a separate paid server and a second language.

**Why not Google Drive alone?** Drive can't query, filter, or lock rows per user, and it's rate-limited; 500 students answering questions at once would break it. So Drive keeps your content, media, uploads, report PDFs, archives and backups, and the free Supabase database keeps live app data. You still buy no storage.

## 2. Free accounts to create (in this order)
1. **GitHub** — code home (free).
2. **Supabase** — create 1 project, region closest to Riyadh (e.g., Frankfurt or Mumbai). Free plan.
3. **Google Cloud** (with the Google account that owns your Drive) → new project → enable **Google Drive API** + **Google Sheets API** → OAuth consent screen (External) → **publish to "In production"** → create OAuth Client (Web). Testing mode would expire your Drive connection every 7 days.
4. **Resend** — free email; verify your domain (DNS records in Vercel).
5. **Vercel** — you already have it; import the GitHub repo after Phase 0.

## 3. Install Claude Code tools (one time)
In a terminal:
```bash
npm i -g typescript-language-server typescript     # needed by the TypeScript LSP plugin
```
Inside Claude Code (in your project folder):
```
/plugin install typescript-lsp@claude-plugins-official
/plugin install frontend-design@claude-plugins-official
/plugin install feature-dev@claude-plugins-official
/plugin install code-review@claude-plugins-official
/plugin install security-guidance@claude-plugins-official
/plugin install commit-commands@claude-plugins-official
```
Browse `/plugin` → Discover for the CLAUDE.md maintenance plugin as an optional extra.

MCP servers (run in the terminal, inside the project folder, then `/mcp` in Claude Code to sign in):
```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
claude mcp add --transport http vercel https://mcp.vercel.com
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&read_only=true&features=database,docs,debugging"
claude mcp add playwright -- npx @playwright/mcp@latest
```

| Tool | What it saves |
|---|---|
| **typescript-lsp** | Claude sees type errors instantly instead of running full builds |
| **context7** | Current library docs in a few hundred tokens instead of web searches |
| **frontend-design** | Polished UI on the first pass → fewer redesign rounds |
| **feature-dev** | Explorer/architect/reviewer agents for big phases |
| **code-review / security-guidance** | Catches bugs and risky code before deploy |
| **commit-commands** | One-word commits/PRs |
| **Supabase MCP (read-only)** | Inspect tables and logs without you copying anything; read-only protects data |
| **Vercel MCP** | Deploy status, logs, env vars from inside Claude Code |
| **Playwright MCP** | Claude clicks through the app to verify its own work |

**Not needed in Claude Code:** a Google Drive MCP. The app itself talks to Drive. Use **Claude chat with the Google Drive connector** to help you *write content* into the sheets.

## 4. Put the pack in your project
```
my-app/
  CLAUDE.md              ← Claude Code reads this automatically every session
  START-HERE.md
  .claude/settings.json  ← permissions + auto-format hook (needs `jq` installed)
  docs/SPEC.md  docs/PHASES.md  docs/DATA_TEMPLATES.md  docs/PROGRESS.md
```

## 5. Token-saving workflow
1. **One phase per session.** `/clear` between phases; `docs/PROGRESS.md` carries the memory, not the chat.
2. **Plan mode** (Shift+Tab) for phases marked [PLAN]. A 2-minute plan review prevents expensive rebuilds.
3. **Model choice:** a top model for Phases 0, 1, 2, 4 (architecture, security, algorithm); a faster/cheaper model (`/model`) for UI-heavy phases 5–7.
4. **Never paste data or long specs into chat.** Point to files ("see DATA_TEMPLATES.md").
5. **`/compact`** when a session gets long. **`/cost`** or **`/usage`** to watch spending.
6. **Small follow-ups** use the template at the bottom of PHASES.md.
7. **Escape early:** if Claude goes the wrong way, press Esc and redirect in one sentence; don't let it finish a wrong approach.

## 6. Free-tier limits to keep in mind
| Service | Free limit | How the design handles it |
|---|---|---|
| Vercel Hobby | Non-commercial use only; limited cron | Free phase is fine. **Upgrade to Pro before charging.** GitHub Actions does frequent scheduling. |
| Supabase Free | 500 MB DB, pauses after 7 idle days, no automatic backups | Daily cron keeps it awake; old answers archived to Drive; nightly backup to Drive |
| Resend Free | 100 emails/day, 3,000/month | One digest per person per period, budget guard, spillover to next day; Gmail adapter optional |
| Google Drive | Your existing quota | Big videos as unlisted YouTube links |

When you start charging, expect roughly: Vercel Pro + Supabase Pro + a paid Resend plan (check current prices then).

## 7. Run it
Open Claude Code in the project folder and paste **Phase 0** from `docs/PHASES.md`.
