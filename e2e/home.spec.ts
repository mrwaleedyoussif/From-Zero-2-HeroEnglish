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
    general: /General learner /,
    student: /student( |$)/i,
    soon: "Soon",
  },
  {
    path: "/ar",
    start: /ابدأ/,
    school: /مستخدم مدرسة/,
    mine: /مدرسة الرياض التجريبية/,
    general: /متعلّم عام/,
    student: /طالب/,
    soon: "قريبًا",
  },
]) {
  test(`home ${c.path}: welcome, then school, then student or staff`, async ({ page }) => {
    // Colours are measured once things stand still: ask for reduced motion, as some users do.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(c.path);
    await page.getByRole("button", { name: c.start }).click();
    // General learners: a way in when the Owner has opened sign-up, otherwise "Soon".
    if (process.env.GENERAL_LEARNERS_ENABLED === "true")
      await expect(page.getByRole("link", { name: c.general })).toHaveAttribute(
        "href",
        `${c.path}/learner`,
      );
    else await expect(page.getByText(c.soon)).toBeVisible();
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

for (const c of [
  {
    path: "/en",
    start: /Start/,
    see: /See the departments/,
    title: "Departments",
    step: "STEP Preparation",
  },
  {
    path: "/ar",
    start: /ابدأ/,
    see: /شاهد الأقسام/,
    title: "الأقسام",
    step: "التحضير لاختبار STEP",
  },
]) {
  test(`departments ${c.path}: every one is shown, all marked Soon`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(c.path);
    await page.getByRole("button", { name: c.start }).click();
    await page.getByRole("link", { name: c.see }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(c.title);
    const cards = page.locator("[data-department]");
    await expect(cards).toHaveCount(10);
    // Four unit departments and STEP are open for general learners; the rest say Soon.
    await expect(page.locator("[data-department][data-soon]")).toHaveCount(5);
    await expect(page.locator('[data-department="step"]')).toContainText(c.step);
    await expect(page.locator('[data-department="step"]')).not.toHaveAttribute("data-soon", /.*/);
    await expect(page.locator("[data-department] a, [data-department] button")).toHaveCount(0);
    await audit(page);

    await page.goto(`${c.path}/departments/andalus-international`);
    await expect(page.locator("[data-department]")).toHaveCount(12);
    await expect(page.locator('[data-department="ghars"]')).toContainText("غرس");
    await audit(page);
  });
}

test("the opening plays after Start and can be skipped", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: /Start/ }).click();
  // The intro (the bloom, to music) is on: the choices wait behind it until it ends or is skipped.
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: /Skip/ }).click();
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  // The public menu is beside the page.
  await expect(page.getByRole("link", { name: "Teachers and staff" })).toHaveAttribute(
    "href",
    "/en/login",
  );
});
