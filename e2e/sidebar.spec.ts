import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// The portal menu (sidebar on a computer, bottom bar on a phone) and adding grades to a school.
test("owner: a task bar of icons, a short side menu that closes by itself, and grades are easy to add", async ({
  page,
}) => {
  await signInByEmail(page, "owner@demo.linguapath.test");
  await page.goto("/en/owner");

  // The top bar fills the screen with the app, and gives the browser back.
  const full = page.locator("[data-full-screen]");
  await full.click();
  await expect(full).toHaveAttribute("aria-pressed", "true");
  await expect(full).toHaveAccessibleName("Leave full screen");
  await full.click();
  await expect(full).toHaveAttribute("aria-pressed", "false");

  // Every page has an icon on the task bar along the bottom.
  const bar = page.locator("[data-taskbar]");
  await expect(bar.getByRole("link", { name: "Audit log", exact: true })).toBeAttached();
  // The side button opens a short menu of the main pages; Escape tucks it away again.
  const button = page.locator("[data-menu-button]");
  const menu = page.locator("#side-menu");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await expect(menu).toHaveAttribute("data-open", "true");
  expect(await menu.getByRole("link").count()).toBeLessThanOrEqual(6);
  await expect(menu.getByRole("link", { name: "Audit log" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("data-open", "false");
  await button.click();
  await page.getByRole("button", { name: "Fold the menu" }).click();
  await expect(menu).toHaveAttribute("data-open", "false");
  // A choice closes it by itself.
  await button.click();
  await menu.getByRole("link", { name: "Schools" }).click();
  await page.getByRole("link", { name: "Riyadh Demo School" }).click();
  await page.getByLabel("From grade").fill("1");
  await page.getByLabel("To grade").fill("3");
  await page.getByRole("button", { name: "Add these grades" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await expect(page.locator("[data-slot=badge]", { hasText: /^Grade 2$/ })).toBeVisible();

  // A full name typed as the code is refused with a message that says what a code is.
  await page.locator("#grade-code").evaluate((el) => el.removeAttribute("pattern"));
  await page.locator("#grade-code").evaluate((el) => el.removeAttribute("maxlength"));
  await page.locator("#grade-code").fill("Grade 9");
  await page.locator("#grade-name_en").fill("Grade 9");
  await page.locator("#grade-name_ar").fill("الصف التاسع");
  await page.getByRole("button", { name: "Add grade", exact: true }).click();
  await expect(page.getByText(/grade code must be 1 to 4 letters or digits/)).toBeVisible();

  // Phone: the task bar scrolls sideways to reach every page.
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/en/owner");
  const audit = bar.getByRole("link", { name: "Audit log", exact: true });
  await audit.scrollIntoViewIfNeeded();
  await audit.click();
  await expect(page).toHaveURL(/\/en\/owner\/audit$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
});
