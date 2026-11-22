# lib/scheduler

`POST|GET /api/cron/tick` (Bearer `CRON_SECRET`) → `runTick()`: plan due reports per school time zone
(`plan.ts`, idempotent dedupe keys in `report_jobs`), then process ≤ 20 jobs in ≤ 50 s:
report → digest email (once per report via `email_log`, priority + daily budget) → PDF to Drive
`04_Reports/{school}/{yyyy}/{mm}/`; daily dashboard refresh; monthly archive of answers older than
6 months to `05_Archive/responses` (CSV.gz + `response_aggregates`).
Triggers: `vercel.json` (daily) and `.github/workflows/tick.yml` (every 15 min).
`npm run reports:dry-run -- --week|--month` shows recipients, emails and deferrals without sending.
