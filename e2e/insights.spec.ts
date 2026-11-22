import { expect, type Page, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Acceptance (Phase 7): principal, coach and teacher demo users each see only their scope;
// every chart has a table fallback. Needs a seeded local Supabase.
test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase not configured");
test.describe.configure({ mode: "serial" });

/** Every chart on the page carries its data table. */
async function chartsHaveTables(page: Page) {
  const charts = page.locator("figure[data-chart]");
  const n = await charts.count();
  for (let i = 0; i < n; i++)
    await expect(charts.nth(i).locator("details[data-table] table")).toHaveCount(1);
  return n;
}

async function openGrade4(page: Page, base: string) {
  await page.goto(`/en/${base}/insights`);
  await page.locator('[data-drill="Grade 4"]').click();
  await expect(page).toHaveURL(/grade=/);
}

test("teacher: own class only, learners visible", async ({ page }) => {
  await signInByEmail(page, "teacher@demo.linguapath.test");
  await openGrade4(page, "teacher");
  expect(await chartsHaveTables(page)).toBeGreaterThan(0);
  await expect(page.locator('[data-drill="4A"]')).toBeVisible();
  await expect(page.locator('[data-drill="4B"]')).toHaveCount(0);
  await page.locator('[data-drill="4A"]').click();
  await expect(page.locator("[data-roster] [data-student]")).toHaveCount(10);
  await chartsHaveTables(page);
  const csv = await page.request.get("/api/export/classes");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const body = await csv.text();
  expect(body).toContain("4A");
  expect(body).not.toContain("4B");
});

test("principal: every class in the school; dashboard charts have tables", async ({ page }) => {
  await signInByEmail(page, "principal@demo.linguapath.test");
  await page.goto("/en/leadership");
  await expect(page.locator('[data-widget="widget.leadership.schoolOverview"]')).toContainText(
    "20",
  );
  expect(await chartsHaveTables(page)).toBeGreaterThanOrEqual(3);
  await expect(page.locator("[data-teacher-usage] tbody tr")).toHaveCount(2);
  await openGrade4(page, "leadership");
  await expect(page.locator('[data-drill="4A"]')).toBeVisible();
  await page.locator('[data-drill="4B"]').click();
  await expect(page.locator("[data-roster] [data-student]")).toHaveCount(10);
  await page.goto("/en/leadership/supervision");
  await expect(page.locator("[data-tree]")).toContainText("Demo Teacher 4B");
});

test("coach: only supported teachers' classes, in aggregate", async ({ page }) => {
  await signInByEmail(page, "coach@demo.linguapath.test");
  await openGrade4(page, "coach");
  await expect(page.locator('[data-drill="4A"]')).toBeVisible();
  await expect(page.locator('[data-drill="4B"]')).toHaveCount(0);
  await page.locator('[data-drill="4A"]').click();
  await expect(page.locator("[data-no-students]")).toBeVisible();
  expect(
    (
      await page.request.get(
        `/api/export/students?class=${new URL(page.url()).searchParams.get("class")}`,
      )
    ).status(),
  ).toBe(403);

  // Coaching log for the supported teacher; it then shows as a follow-up on the coach's home.
  await page.goto("/en/coach/coaching-log");
  await page.getByLabel("Teacher").selectOption({ label: "Demo Teacher" });
  await page.getByLabel("Student engagement").selectOption("3");
  await page.getByLabel("Notes").fill("Clear modelling; more pair work next time.");
  const followUp = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Follow-up date").fill(followUp);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator('[data-log="Demo Teacher"]')).toContainText("Student engagement: 3");
  await page.goto("/en/coach");
  await expect(page.locator('[data-widget="widget.coach.coachingFollowUps"]')).toContainText(
    "Demo Teacher",
  );
  await expect(
    page.locator('[data-widget="widget.coach.supportedTeachers"] [data-teacher]'),
  ).toHaveCount(1);
});
