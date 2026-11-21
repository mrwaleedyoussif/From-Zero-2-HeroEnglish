import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Needs a running, seeded local Supabase (Mailpit for magic links).
test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase not configured");
// Supabase keeps only the newest magic link per user, so these sign-ins must not overlap.
test.describe.configure({ mode: "serial" });

const WIDGET = "widget.teacher.atRiskStudents";
const widget = `[data-widget="${WIDGET}"]`;

test("acceptance: hiding a widget for class 4A removes it only for 4A's teacher", async ({
  browser,
}) => {
  const owner = await (await browser.newContext()).newPage();
  await signInByEmail(owner, "owner@demo.linguapath.test");
  await expect(owner).toHaveURL(/\/en\/owner$/);

  // Owner adds the rule in the Visibility Studio.
  await owner.goto(`/en/owner/visibility?key=${WIDGET}`);
  await owner.getByLabel("Action").selectOption("hide");
  await owner.getByLabel("For", { exact: true }).selectOption({ label: "Class: RIY01 · 4A" });
  await owner.getByRole("button", { name: "Add rule" }).click();
  await expect(owner.getByText("Saved")).toBeVisible();
  await expect(owner.locator('[data-class="4A"]')).toContainText("hidden");
  await expect(owner.locator('[data-class="4B"]')).toContainText("shown");

  try {
    const t4a = await (await browser.newContext()).newPage();
    await signInByEmail(t4a, "teacher@demo.linguapath.test");
    await expect(t4a).toHaveURL(/\/en\/teacher$/);
    await expect(t4a.locator('[data-widget="widget.teacher.classRoster"]')).toBeVisible();
    await expect(t4a.locator(widget)).toHaveCount(0);

    const t4b = await (await browser.newContext()).newPage();
    await signInByEmail(t4b, "teacher.4b@demo.linguapath.test");
    await expect(t4b).toHaveURL(/\/en\/teacher$/);
    await expect(t4b.locator(widget)).toBeVisible();

    // "Check a person" explains the decision.
    await owner.goto(`/en/owner/visibility?key=${WIDGET}&user=teacher@demo.linguapath.test`);
    await expect(owner.getByRole("status").filter({ hasText: "does not see it" })).toBeVisible();
  } finally {
    // Leave the database as we found it (soft: never hide the real failure).
    await owner.goto(`/en/owner/visibility?key=${WIDGET}`);
    await owner.getByRole("button", { name: "Remove" }).first().click();
    await expect.soft(owner.getByText("Removed")).toBeVisible();
    await expect.soft(owner.getByText("No rules — everyone gets the default.")).toBeVisible();
  }
});

test("owner lands on the owner gate and can switch to other gates they hold", async ({ page }) => {
  await signInByEmail(page, "owner@demo.linguapath.test");
  await expect(page).toHaveURL(/\/en\/owner$/);
  await expect(page.locator('[data-widget="widget.owner.schools"]')).toBeVisible();
  const switcher = page.getByRole("navigation", { name: "Switch portal" });
  await expect(switcher.getByRole("link", { name: "Teaching" })).toBeVisible();
  await switcher.getByRole("link", { name: "School leadership" }).click();
  await expect(page).toHaveURL(/\/en\/leadership$/);
});
