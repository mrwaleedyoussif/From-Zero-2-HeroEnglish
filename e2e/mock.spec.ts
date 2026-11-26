import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { makeDocx, SAMPLE_MOCK } from "../src/lib/docx/make-docx";
import { signInByEmail } from "./helpers";

// Needs STORAGE_DRIVER=fake with FAKE_DRIVE_DIR, and the seeded local Supabase. The demo school
// is renamed to an Andalus International one for a moment so its student sees STEP.
const DRIVE = process.env.FAKE_DRIVE_DIR;
test.skip(process.env.STORAGE_DRIVER !== "fake" || !DRIVE, "fake Drive not configured");
const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-qtAc", q]).toString().trim();

test("a student sits a timed STEP mock section by section and sees the marked review", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const folder = join(DRIVE ?? "", "LinguaPath/01_Content/Units/MOCKS");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "STEP_F_Mock_01.docx"), makeDocx(SAMPLE_MOCK));
  const name = sql("select name_en from schools where code = 'RIY01'");
  sql("update schools set name_en = 'Andalus International School Riyadh' where code = 'RIY01'");
  try {
    const owner = await (await browser.newContext()).newPage();
    await signInByEmail(owner, "owner@demo.linguapath.test");
    await owner.goto("/en/owner/content");
    await owner.getByRole("button", { name: "Import units from Drive" }).click();
    await expect(owner.locator("[data-units-imported='1']")).toContainText("1 saved");

    const page = await (await browser.newContext()).newPage();
    await page.goto("/en/student-login");
    await page.getByLabel("School code").fill("riy01");
    await page.getByLabel("Username").fill("omar.s");
    await page.getByLabel("PIN (6 digits)").fill("246810");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/student$/, { timeout: 15_000 });
    await page.goto("/en/student/step/mocks");
    await page.locator("[data-mock='M01']").click();
    await expect(page.getByText("2 questions · 5 minutes")).toBeVisible();
    await page.locator("[data-start-mock]").click();

    // Section 1: a clock, the passage, answers kept as they are chosen; no key on the page.
    await expect(page.locator("[data-mock-section='1']")).toBeVisible();
    await expect(page.locator("[data-mock-clock]")).toContainText(/4:5\d|5:00/);
    expect(await page.content()).not.toContain("It says near Qassim");
    const q1 = page.locator("[data-question='M01-Q001']");
    await q1.getByRole("radio", { name: /near Qassim/ }).click();
    await page.waitForTimeout(800); // the answer is saved in the background
    await page.reload(); // answers survive a reload
    await expect(q1.getByRole("radio", { name: /near Qassim/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("button", { name: "Finish this section" }).click();
    await expect(page.getByText("1 question is not answered")).toBeVisible();
    await page.locator("[data-confirm-leave]").click();

    // Section 3 (listening): once left, section 1 is closed.
    await expect(page.locator("[data-mock-section='3']")).toBeVisible();
    await expect(page.locator("[data-track='M01-L-01']")).toBeVisible();
    await page
      .locator("[data-question='M01-Q003']")
      .getByRole("radio", { name: /a book/ })
      .click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Finish this section" }).click();
    await page.locator("[data-confirm-leave]").click();

    // The result: 2 of 3, by section, with the review.
    await expect(page.locator("[data-mock-result='2']")).toBeVisible();
    await expect(page.locator("[data-section-score='1']")).toContainText("1 / 2");
    await expect(page.locator("[data-review='M01-Q002'][data-right='false']")).toBeAttached();
    await page.goto("/en/student/step/mocks");
    await expect(page.locator("[data-mock='M01']")).toContainText("Best score: 2");
  } finally {
    sql(`update schools set name_en = '${name.replaceAll("'", "''")}' where code = 'RIY01'`);
    sql("delete from mock_exams");
    rmSync(folder, { recursive: true, force: true });
  }
});
