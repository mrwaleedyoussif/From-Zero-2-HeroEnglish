import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// The public home page (needs the seeded local database for the demo school).
const audit = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
};

for (const c of [
  {
    path: "/en",
    start: /Start/,
    school: /School user/,
    mine: /Riyadh Demo School/,
    student: /Student/,
    soon: "Soon",
  },
  {
    path: "/ar",
    start: /ابدأ/,
    school: /مستخدم مدرسة/,
    mine: /مدرسة الرياض التجريبية/,
    student: /طالب/,
    soon: "قريبًا",
  },
]) {
  test(`home ${c.path}: welcome, then school, then student or staff`, async ({ page }) => {
    // Colours are measured once things stand still: ask for reduced motion, as some users do.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(c.path);
    await page.getByRole("button", { name: c.start }).click();
    // The choice: general learners are announced as coming soon and are not clickable.
    await expect(page.getByText(c.soon)).toBeVisible();
    await expect(page.getByRole("button", { name: c.school })).toBeVisible();
    await audit(page);

    // School users pick their school (and branch, when it has several) before who they are.
    await page.getByRole("button", { name: c.school }).click();
    await audit(page);
    await page.getByRole("button", { name: c.mine }).click();
    await audit(page);
    await page.getByRole("link", { name: c.student }).click();
    // The sign-in form already knows the school.
    await expect(page).toHaveURL(/\/student-login\?school=RIY01$/);
    await expect(page.getByLabel(/School code|رمز المدرسة/)).toHaveValue("RIY01");

    // The welcome screen shows once per visit, and the last choice is offered as a shortcut.
    await page.goto(c.path);
    await expect(page.getByRole("button", { name: c.start })).toHaveCount(0);
    await expect(page.getByRole("link", { name: c.student })).toBeVisible();
  });
}
