/**
 * npm run tick — trigger one scheduler tick on the running app (local dev or a deployment),
 * exactly like the GitHub Actions ticker: POST /api/cron/tick with the CRON_SECRET.
 * Uses NEXT_PUBLIC_APP_URL and CRON_SECRET from the environment.
 */
const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}
const res = await fetch(`${url}/api/cron/tick`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
console.log(res.status, await res.text());
if (!res.ok) process.exit(1);
