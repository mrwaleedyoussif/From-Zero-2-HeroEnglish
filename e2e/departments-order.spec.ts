import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Needs the seeded local Supabase. The demo school is renamed to an Andalus International one
// for a moment, so the demo student sees that list; everything is put back afterwards.
const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-qtAc", q]).toString().trim();

const unit = (n: number) =>
  JSON.stringify({
    id: `RW-A1-U0${n}`,
    strand: "RW",
    level: "A1",
    unit: n,
    title: `Order unit ${n}`,
    passage: { id: `T${n}`, title: "A text", paragraphs: ["Reem has a new phone."] },
    comprehension: [
      { id: `Q${n}`, type: "tfng", skill: "detail", stem: "Reem has a phone.", answer: "True" },
    ],
  });

async function signInStudent(page: Page) {
  await page.goto("/en/student-login");
  await page.getByLabel("School code").fill("riy01");
  await page.getByLabel("Username").fill("omar.s");
  await page.getByLabel("PIN (6 digits)").fill("246810");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/student$/, { timeout: 15_000 });
}

test("the Owner opens a department; its units open one after another", async ({ browser }) => {
  test.setTimeout(120_000);
  const name = sql("select name_en from schools where code = 'RIY01'");
  const since = sql("select now()");
  sql("update schools set name_en = 'Andalus International School Riyadh' where code = 'RIY01'");
  for (const n of [1, 2])
    sql(`insert into course_units (id, strand, level, unit, title, content, hash)
         values ('RW-A1-U0${n}', 'RW', 'A1', ${n}, 'Order unit ${n}', '${unit(n)}'::jsonb, 'x${n}')
         on conflict (id) do nothing`);
  try {
    // 1. The Owner closes Reading and Writing for Andalus, then opens it again.
    const owner = await (await browser.newContext()).newPage();
    await signInByEmail(owner, "owner@demo.linguapath.test");
    await owner.goto("/en/owner/departments");
    const sw = owner.locator("[data-switch='andalus-international:readingWriting']");
    await expect(sw).toHaveAttribute("data-state", "open");
    await sw.getByRole("radio", { name: "Soon" }).click();
    await expect(sw).toHaveAttribute("data-state", "soon");
    await sw.getByRole("radio", { name: "Open" }).click();
    await expect(sw).toHaveAttribute("data-state", "open");
    // Hiding one takes it off the public list.
    const phonics = owner.locator("[data-switch='andalus-international:phonics']");
    await phonics.getByRole("radio", { name: "Hidden" }).click();
    await expect(phonics).toHaveAttribute("data-state", "hidden"); // saved before leaving
    await owner.goto("/en/departments/andalus-international");
    await expect(owner.locator("[data-department='phonics']")).toHaveCount(0);
    await expect(owner.locator("[data-department='readingWriting']")).not.toHaveAttribute(
      "data-soon",
      /.*/,
    );

    // 2. The student sees unit 1 open and unit 2 locked.
    const page = await (await browser.newContext()).newPage();
    await signInStudent(page);
    await page.goto("/en/student/units/RW");
    await expect(page.locator("[data-unit='RW-A1-U01']:not([data-locked])")).toBeVisible();
    await expect(page.locator("[data-unit='RW-A1-U02'][data-locked]")).toBeVisible();
    await page.goto("/en/student/units/RW/RW-A1-U02");
    await expect(page.locator("[data-unit-locked]")).toContainText("not open yet");

    // 3. The teacher recommends unit 2 to the class: it opens for the student at once.
    const teacher = await (await browser.newContext()).newPage();
    await signInByEmail(teacher, "teacher@demo.linguapath.test");
    await teacher.goto("/en/student/units/RW");
    await expect(teacher.locator("[data-recommend-hint]")).toBeVisible();
    await teacher.goto("/en/student/units/RW/RW-A1-U02");
    const panel = teacher.locator("[data-part='recommend']");
    await expect(panel).toHaveCount(0); // opens from the button beside the title
    await teacher.locator("[data-recommend-open]").click();
    await panel
      .getByRole("navigation", { name: "Choose a class" })
      .getByRole("link")
      .first()
      .click();
    await panel.getByRole("checkbox", { name: /The whole class/ }).check();
    await panel.getByLabel("A short note (optional)").fill("Read it before Sunday");
    await panel.locator("[data-recommend]").click();
    await expect(teacher.getByText("Recommended", { exact: true })).toBeVisible();
    await page.goto("/en/student");
    const pick = page.locator("[data-recommended='RW-A1-U02']");
    await expect(pick).toContainText("Order unit 2");
    await expect(pick).toContainText("Read it before Sunday");
    await page.goto("/en/student/units/RW");
    await expect(page.locator("[data-unit='RW-A1-U02']:not([data-locked])")).toContainText(
      "Recommended by your teacher",
    );
    await expect(page.locator("[data-part='recommend']")).toHaveCount(0); // never for a learner

    await page.goto("/en/student/units/RW/RW-A1-U01");
    await page.locator("[data-question='Q1']").getByRole("button", { name: "True" }).click();
    await page.getByRole("button", { name: "Submit my answers" }).click();
    await expect(page.locator("[data-question='Q1']")).toContainText("Well done!");
    await page.locator("[data-next-unit='RW-A1-U02']").click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Order unit 2");
  } finally {
    // Finishing work sends the learner notifications; later tests count them.
    sql(`delete from notifications where created_at >= '${since}'`);
    sql(`update schools set name_en = '${name.replaceAll("'", "''")}' where code = 'RIY01'`);
    sql("delete from department_states where audience = 'andalus-international'");
    sql("delete from course_units where id in ('RW-A1-U01', 'RW-A1-U02')");
  }
});
