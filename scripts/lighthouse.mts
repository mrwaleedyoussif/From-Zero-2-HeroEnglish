/**
 * npm run lighthouse — Lighthouse on the student pages (SPEC: performance ≥ 90).
 * Signs in a demo student with Playwright, then runs Lighthouse (mobile profile) with that
 * session cookie against a production build (`npm run build && npm start`, or E2E_BASE_URL).
 * Needs the seeded demo data (school RIY01, student sara.k).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const chrome = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";
const pages = process.env.LH_PAGES?.split(",") ?? [
  "/en/student",
  "/en/student/lessons",
  "/en/student/rewards",
  "/ar/student",
  "/ar/student/lessons",
];
const MIN = 90;

const browser = await chromium.launch({ executablePath: chrome });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`${base}/en/student-login`);
await page.getByLabel("School code").fill("riy01");
await page.getByLabel("Username").fill("sara.k");
await page.getByLabel("PIN (6 digits)").fill("246810");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/en\/student$/);
const cookie = (await context.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
await browser.close();

const out = mkdtempSync(join(tmpdir(), "lh-"));
/** Lighthouse scores vary from run to run; its docs recommend the median of several runs. */
const RUNS = Number(process.env.LH_RUNS ?? 3);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

function run(path: string, n: number): Record<string, number> {
  const file = join(out, `${path.replace(/\W+/g, "_")}-${n}.json`);
  execFileSync(
    "npx",
    [
      "--yes",
      "lighthouse@12.8.2",
      `${base}${path}`,
      "--quiet",
      "--output=json",
      `--output-path=${file}`,
      "--only-categories=performance,accessibility,best-practices",
      `--chrome-flags=--headless=new --no-sandbox`,
      `--extra-headers=${JSON.stringify({ Cookie: cookie })}`,
    ],
    { stdio: "inherit", env: { ...process.env, CHROME_PATH: chrome } },
  );
  const report = JSON.parse(readFileSync(file, "utf8")) as {
    categories: Record<string, { score: number }>;
    finalDisplayedUrl: string;
  };
  if (!report.finalDisplayedUrl.includes(path)) throw new Error(`${path} redirected (signed out?)`);
  return Object.fromEntries(
    Object.entries(report.categories).map(([k, v]) => [k, Math.round(v.score * 100)]),
  );
}

let failed = false;
for (const path of pages) {
  const runs = Array.from({ length: RUNS }, (_, i) => run(path, i));
  const m = (k: string) => median(runs.map((r) => r[k] ?? 0));
  const ok = m("performance") >= MIN;
  if (!ok) failed = true;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${path}  performance ${m("performance")} (runs ${runs.map((r) => r.performance).join("/")}) · accessibility ${m("accessibility")} · best practices ${m("best-practices")}`,
  );
}
process.exit(failed ? 1 : 0);
