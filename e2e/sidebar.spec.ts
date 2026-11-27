import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// The portal menu (sidebar on a computer, bottom bar on a phone) and adding grades to a school.
test("owner: the menu is a side button that opens and closes by itself, and grades are easy to add", async ({
  page,
}) => {
  await signInByEmail(page, "owner@demo.linguapath.test");
  await page.goto("/en/owner");

  // The menu waits as a button on the right edge; it opens, and Escape tucks it away again.
  const button = page.locator("[data-menu-button]");
  const menu = page.locator("#side-menu");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: "Schools" })).toBeHidden();
  await button.click();
  await expect(menu).toHaveAttribute("data-open", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("data-open", "false");
  await button.click();
  await page.getByRole("button", { name: "Fold the menu" }).click();
  await expect(menu).toHaveAttribute("data-open", "false");
  // A choice closes it by itself.
  await button.click();
  await page.getByRole("link", { name: "Schools" }).click();
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

  // Phone: the same button; a long menu scrolls inside the panel.
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/en/owner");
  await expect(page.getByRole("link", { name: "Audit log", exact: true })).toBeHidden();
  await button.click();
  await page.getByRole("link", { name: "Audit log", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/owner\/audit$/);
  await expect(menu).toHaveAttribute("data-open", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
});
