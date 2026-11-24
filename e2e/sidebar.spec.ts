import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// The portal menu (sidebar on a computer, bottom bar on a phone) and adding grades to a school.
test("owner: the menu folds, becomes a bottom bar on a phone, and grades are easy to add", async ({
  page,
}) => {
  await signInByEmail(page, "owner@demo.linguapath.test");
  await page.goto("/en/owner");

  const fold = page.getByRole("button", { name: "Fold the menu" });
  await expect(fold).toHaveAttribute("aria-expanded", "true");
  await fold.click();
  const open = page.getByRole("button", { name: "Open the menu" });
  await expect(open).toHaveAttribute("aria-expanded", "false");
  // Folded: names are still there for screen readers, and the choice survives a reload.
  await expect(page.getByRole("link", { name: "Schools" })).toBeVisible();
  await page.reload();
  await expect(open).toBeVisible();
  await open.click();

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

  // Phone: the first items sit in a bar at the bottom; the rest are behind "More".
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/en/owner");
  await expect(page.getByRole("link", { name: "Users", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Audit log", exact: true })).toBeHidden();
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("link", { name: "Audit log", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/owner\/audit$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
});
