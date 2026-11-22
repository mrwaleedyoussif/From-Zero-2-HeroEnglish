import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Acceptance (Phase 8): running the tick twice never sends duplicates. Needs a seeded local
// Supabase, the app's CRON_SECRET in the test environment, and MAIL_PROVIDER=console (default).
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.CRON_SECRET,
  "Supabase/CRON_SECRET not configured",
);
test.describe.configure({ mode: "serial" });

const auth = { Authorization: `Bearer ${process.env.CRON_SECRET}` };

test("tick: secret required; repeated ticks never send an email twice", async ({
  page,
  request,
}) => {
  expect((await request.post("/api/cron/tick")).status()).toBe(401);
  expect(
    (await request.post("/api/cron/tick", { headers: { Authorization: "Bearer wrong" } })).status(),
  ).toBe(401);

  // Tick until the queue is drained (≤ 20 jobs per tick), then tick twice more.
  for (let i = 0; i < 6; i++) {
    const r = await request.post("/api/cron/tick", { headers: auth });
    expect(r.status()).toBe(200);
    if ((await r.json()).processed === 0) break;
  }
  await signInByEmail(page, "owner@demo.linguapath.test");
  await page.goto("/en/owner/reports");
  const sent = Number(await page.locator("[data-emails-today]").getAttribute("data-emails-today"));
  expect(sent).toBeGreaterThan(0);
  // Every report is emailed once: the emailed archive rows equal today's sends.
  await expect(page.locator("[data-report-row]").filter({ hasText: "emailed" })).toHaveCount(sent);

  for (let i = 0; i < 2; i++) {
    const again = await (await request.post("/api/cron/tick", { headers: auth })).json();
    expect(again).toMatchObject({ planned: 0, failed: 0 });
  }
  await page.reload();
  await expect(page.locator("[data-emails-today]")).toHaveAttribute(
    "data-emails-today",
    String(sent),
  );
  await expect(page.locator('[data-job="email:failed"]')).toHaveCount(0);
});

test("teacher: report in the archive and the bell; the report shows their class", async ({
  page,
}) => {
  await signInByEmail(page, "teacher@demo.linguapath.test");
  await page.goto("/en/teacher/reports");
  await page.locator('[data-report-row="weekly"] a').first().click();
  await expect(page).toHaveURL(/\/en\/reports\/[0-9a-f-]{36}$/);
  await expect(page.locator('[data-report="weekly"] [data-section="classes"]')).toContainText("4A");
  await expect(page.locator('[data-report="weekly"] [data-section="classes"]')).not.toContainText(
    "4B",
  );
  await expect(page.locator("[data-pdf]")).toBeVisible();
  const pdf = await page.request.get((await page.locator("[data-pdf]").getAttribute("href")) ?? "");
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  await page.goto("/en/teacher");
  await page.locator("[data-notifications] summary").click();
  await expect(page.getByText("A report is ready").first()).toBeVisible();
});
