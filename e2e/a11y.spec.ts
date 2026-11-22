import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Accessibility pass (Phase 9): WCAG 2.1 A/AA rules from axe-core, in English and Arabic.
test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase not configured");

/** Every axe violation on each page, collected so one run shows them all. */
async function auditAll(page: Page, paths: string[]) {
  const problems: string[] = [];
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    for (const v of result.violations)
      problems.push(
        `${path} · ${v.id} (${v.impact}): ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join(" | ")}`,
      );
  }
  expect(problems, problems.join("\n")).toEqual([]);
}

test("public pages", async ({ page }) => {
  await auditAll(page, ["/en", "/ar", "/en/login", "/ar/student-login"]);
});

test("student pages (en + ar)", async ({ page }) => {
  await page.goto("/en/student-login");
  await page.getByLabel("School code").fill("riy01");
  await page.getByLabel("Username").fill("sara.k");
  await page.getByLabel("PIN (6 digits)").fill("246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/student$/);
  await auditAll(page, [
    "/en/student",
    "/en/student/lessons",
    "/en/student/placement",
    "/en/student/rewards",
    "/en/student/profile",
    "/ar/student",
    "/ar/student/rewards",
  ]);
});

test("staff pages (en + ar)", async ({ page }) => {
  await signInByEmail(page, "principal@demo.linguapath.test");
  await auditAll(page, [
    "/en/leadership",
    "/en/leadership/insights",
    "/ar/leadership",
    "/en/leadership/supervision",
    "/en/leadership/reports",
  ]);
});
