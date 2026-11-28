import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

// Needs the seeded local Supabase: a shadowing unit is put in for the test and taken out after.
const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-qtAc", q]).toString().trim();

const unit = JSON.stringify({
  id: "SH-A1-U09",
  strand: "SH",
  level: "A1",
  unit: 9,
  title: "Speed unit",
  vocabulary: [{ id: "SH-A1-U09-VOC01", word: "camera", definition: "It takes photos." }],
  model_text: {
    id: "SH-A1-U09-MOD",
    title: "Say it with me",
    chunks: [{ id: "SH-A1-U09-CH01", text: "Reem has a new phone." }],
  },
  speaking_task: { prompt: { en: "Talk about your phone." }, frames: ["I have a ..."] },
});

test("shadowing and speaking: the learner chooses the voice's speed; vocabulary stays at normal speed", async ({
  page,
}) => {
  sql(`insert into course_units (id, strand, level, unit, title, content, hash)
       values ('SH-A1-U09', 'SH', 'A1', 9, 'Speed unit', '${unit}'::jsonb, 'spd')
       on conflict (id) do nothing`);
  try {
    // Record what the page asks the device voice to say, and how fast.
    await page.addInitScript(() => {
      const said: { text: string; rate: number }[] = [];
      Object.assign(window, { __said: said });
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) =>
        void said.push({ text: u.text, rate: u.rate });
    });
    await signInByEmail(page, "owner@demo.linguapath.test");
    await page.goto("/en/student/units/SH/SH-A1-U09");
    const rates = (text: string) =>
      page.evaluate(
        (t) =>
          (window as unknown as { __said: { text: string; rate: number }[] }).__said
            .filter((s) => s.text === t)
            .map((s) => s.rate),
        text,
      );
    const shadow = page.locator("[data-part='shadow']");
    const speed = shadow.getByRole("radiogroup", { name: "Voice speed" });
    await expect(speed.getByRole("radio", { name: "Normal" })).toBeChecked();
    const listen = shadow.locator("[data-chunk='SH-A1-U09-CH01']").getByRole("button", {
      name: /^Listen/,
    });
    await listen.click();
    await speed.getByRole("radio", { name: "Very slow" }).click();
    await listen.click();
    await speed.getByRole("radio", { name: "Fast" }).click();
    await listen.click();
    const [normal, slow, fast] = await rates("Reem has a new phone.");
    expect(slow).toBeLessThan(normal!);
    expect(fast).toBeGreaterThan(normal!);
    // The speaking task has the same control, and it follows the choice made above.
    await expect(
      page
        .locator("[data-part='speaking']")
        .getByRole("radiogroup", { name: "Voice speed" })
        .getByRole("radio", { name: "Fast" }),
    ).toBeChecked();
    // A vocabulary word is said at the voice's normal speed, whatever the level or the choice.
    await page
      .locator("[data-part='words']")
      .getByRole("button", { name: /camera/ })
      .click();
    expect(await rates("camera")).toEqual([1]);
    // The choice is remembered on the device.
    await page.reload();
    await expect(
      page.locator("[data-part='shadow']").getByRole("radio", { name: "Fast" }),
    ).toBeChecked();
  } finally {
    sql("delete from course_units where id = 'SH-A1-U09'");
  }
});
