import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-qtAc", q]).toString().trim();
const SHOTS = process.env.SHOTS_DIR;

const CSV = [
  "school_name,school_code,full_name,role,class",
  "Jeddah New School,JED77,Sara Khalid,Student,4B",
  // A spreadsheet counted the code upwards when it was dragged down: the import puts it back.
  "Jeddah New School,JED78,Sami Khalid,student,4B",
  "Jeddah New School,JED77,Mona Ali,Teacher,4B",
  "Jeddah New School,JED77,Huda Saleh,Vice Principal,",
  "Jeddah New School,JED77,No Grade,student,B",
  "Old School,NOYR1,Ahmed Hatem,student,5A",
].join("\n");

/** Choose the file once the page listens (a file chosen too early is not noticed). */
async function choose(page: Page) {
  await expect(async () => {
    await page
      .locator("#csv-file")
      .setInputFiles({ name: "users.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
    await expect(page.getByRole("button", { name: "Check file" })).toBeEnabled({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
}

async function pinSignIn(page: Page, username: string, pin: string) {
  await page.goto("/en/student-login");
  await page.getByLabel("School code").fill("jed77");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("PIN (6 digits)").fill(pin);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("a five-column users file makes the school, classes, usernames and PINs; staff sign in with theirs", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  // A school made earlier that never got a school year: the import starts one.
  sql("insert into schools (code, name_en, name_ar) values ('NOYR1', 'Old School', 'Old School')");
  try {
    await signInByEmail(page, "owner@demo.linguapath.test");
    await page.goto("/en/owner/users/import");
    await choose(page);
    await page.getByRole("button", { name: "Check file" }).click();
    await expect(
      page.getByText("5 to create · 0 already exist (skipped) · 1 with errors"),
    ).toBeVisible();
    await expect(page.getByText("will create the school Jeddah New School").first()).toBeVisible();
    await expect(page.getByText(/cannot tell the grade from the class/)).toBeVisible();
    // Two people who would get the same username get different ones.
    await expect(page.getByRole("cell", { name: "JED77 · student · sara.k" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "JED77 · student · sami.k" })).toBeVisible();
    await expect(page.getByText(/will start the current school year/)).toBeVisible();
    await expect(page.getByText(/school code corrected \(the file said JED78\)/)).toBeVisible();
    await page.getByRole("button", { name: "Create 5 accounts" }).click();
    await expect(page.getByText("Done: 5 created, 0 failed.")).toBeVisible();
    expect(
      sql(
        "select count(*) from academic_years y join schools s on s.id = y.school_id where s.code = 'NOYR1' and y.is_current",
      ),
    ).toBe("1");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/imp-cards.png`, fullPage: true });

    expect(sql("select name_en from schools where code = 'JED77'")).toBe("Jeddah New School");
    expect(sql("select count(*) from schools where code = 'JED78'")).toBe("0");
    expect(
      sql(
        "select count(*) from classes c join schools s on s.id = c.school_id where s.code = 'JED77'",
      ),
    ).toBe("1");
    // PINs are shown once; here a fresh one is set through the same path a teacher would use.
    const cards = await page.locator("body").innerText();
    const pinOf = (username: string) =>
      new RegExp(`${username.replace(".", "\\.")}[\\s\\S]{0,80}?(\\d{6})`).exec(cards)?.[1] ?? "";

    const teacher = await (await browser.newContext()).newPage();
    await pinSignIn(teacher, "mona.a", pinOf("mona.a"));
    await expect(teacher).toHaveURL(/\/en\/teacher$/, { timeout: 15_000 });
    const vp = await (await browser.newContext()).newPage();
    await pinSignIn(vp, "huda.s", pinOf("huda.s"));
    await expect(vp).toHaveURL(/\/en\/leadership$/, { timeout: 15_000 });
    const student = await (await browser.newContext()).newPage();
    await pinSignIn(student, "sara.k", pinOf("sara.k"));
    await expect(student).toHaveURL(/\/en\/student/, { timeout: 15_000 });

    // The same file again: everyone is already there.
    await page.goto("/en/owner/users/import");
    await choose(page);
    await page.getByRole("button", { name: "Check file" }).click();
    await expect(
      page.getByText("0 to create · 5 already exist (skipped) · 1 with errors"),
    ).toBeVisible();
  } finally {
    const ids = sql(
      "select coalesce(string_agg(quote_literal(p.id::text), ','), '') from profiles p join schools s on s.id = p.school_id where s.code in ('JED77', 'NOYR1')",
    );
    if (ids) sql(`delete from auth.users where id::text in (${ids})`);
    sql("delete from schools where code in ('JED77', 'NOYR1')");
    sql("delete from presence");
  }
});
