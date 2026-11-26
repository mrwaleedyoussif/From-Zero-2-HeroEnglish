import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { makeDocx, SAMPLE_BOOKLET } from "../src/lib/docx/make-docx";
import { signInByEmail } from "./helpers";

// Needs STORAGE_DRIVER=fake with FAKE_DRIVE_DIR, and the seeded local Supabase. The demo school
// is renamed to an Andalus International one for a moment so its student sees STEP.
const DRIVE = process.env.FAKE_DRIVE_DIR;
test.skip(process.env.STORAGE_DRIVER !== "fake" || !DRIVE, "fake Drive not configured");
const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-qtAc", q]).toString().trim();

test("the Owner imports a STEP booklet (Word); a student studies the lesson and its quiz", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const folder = join(DRIVE ?? "", "LinguaPath/01_Content/Units/STEP");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "STEP_F_B1_Grammar_Unit1_A1_Part1.docx"), makeDocx(SAMPLE_BOOKLET));
  writeFileSync(join(folder, "STEP_F_B1_Grammar_MASTER.docx"), makeDocx(["not read"]));
  const name = sql("select name_en from schools where code = 'RIY01'");
  const since = sql("select now()");
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
    await page.goto("/en/student/step");
    await expect(page.locator("[data-booklet='SG']")).toContainText("0 of 1 lessons");
    await page.locator("[data-booklet='SG']").click();
    await page.locator("[data-unit='SG-A1-L1-1']").click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("1.1 Pronouns and be");
    // The lesson's teaching shows; the teacher's classroom activity does not.
    await expect(page.locator("[data-part='notes']")).toContainText("He is a doctor.");
    await expect(page.locator("[data-part='notes']")).not.toContainText("RallyRobin");
    expect(await page.content()).not.toContain("With I we always use am.");

    const quiz = page.locator("[data-part='quiz']");
    await expect(quiz).toContainText("Part A — Sentence Completion");
    await quiz
      .locator("[data-question='SG-A1-L1-1-Q01']")
      .getByRole("button", { name: /am/ })
      .click();
    await quiz
      .locator("[data-question='SG-A1-L1-1-Q02']")
      .getByRole("button", { name: /is/ })
      .click();
    await quiz.getByRole("button", { name: "Submit my answers" }).click();
    await expect(quiz.locator("[data-question='SG-A1-L1-1-Q01']")).toContainText(
      "With I we always use am.",
    );
    await expect(quiz.locator("[data-question='SG-A1-L1-1-Q02']")).toContainText("C. are");
  } finally {
    // Finishing work sends the learner notifications; later tests count them.
    sql(`delete from notifications where created_at >= '${since}'`);
    sql(`update schools set name_en = '${name.replaceAll("'", "''")}' where code = 'RIY01'`);
    sql("delete from course_units where strand = 'SG'");
    rmSync(folder, { recursive: true, force: true });
  }
});
