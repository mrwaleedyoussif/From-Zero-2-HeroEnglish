import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

// The placement test is one Owner switch (module.placement). The demo seed turns it on; here it
// is turned off for a moment, which must hide the menu item, the page and the home card.
const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-qtc", q]);

test("with the placement switch off, students see no level test anywhere", async ({ page }) => {
  sql("update visibility_rules set effect = 'hide' where target_key = 'module.placement'");
  try {
    await page.goto("/en/student-login");
    await page.getByLabel("School code").fill("riy01");
    await page.getByLabel("Username").fill("omar.s");
    await page.getByLabel("PIN (6 digits)").fill("246810");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/student$/, { timeout: 15_000 });
    await expect(page.locator("a[href$='/student/placement']")).toHaveCount(0);
    // The page behaves as if it did not exist (inside the portal the status can stream as 200).
    await page.goto("/en/student/placement");
    await expect(page.getByText("We could not find that page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start the test" })).toHaveCount(0);
  } finally {
    sql("update visibility_rules set effect = 'show' where target_key = 'module.placement'");
  }
});
