import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// The public home page: no sign-in and no data, so it is safe against a deployed site too.
const audit = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
};

for (const c of [
  { path: "/en", start: /Start/, school: /School user/, student: /Student/, soon: "Soon" },
  { path: "/ar", start: /ابدأ/, school: /مستخدم مدرسة/, student: /طالب/, soon: "قريبًا" },
]) {
  test(`home ${c.path}: welcome screen, then general learner or school user`, async ({ page }) => {
    await page.goto(c.path);
    await page.getByRole("button", { name: c.start }).click();
    // The choice: general learners are announced as coming soon and are not clickable.
    await expect(page.getByText(c.soon)).toBeVisible();
    await expect(page.getByRole("button", { name: c.school })).toBeVisible();
    await page.waitForTimeout(1200); // entrance animations finished
    await audit(page);

    await page.getByRole("button", { name: c.school }).click();
    await page.waitForTimeout(900);
    await audit(page);
    await page.getByRole("link", { name: c.student }).click();
    await expect(page).toHaveURL(/\/student-login$/);

    // The welcome screen shows once per visit, and the last choice is offered as a shortcut.
    await page.goto(c.path);
    await expect(page.getByRole("button", { name: c.start })).toHaveCount(0);
    await expect(page.getByRole("link", { name: c.student })).toBeVisible();
  });
}
