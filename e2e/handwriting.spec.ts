import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-qtAc", q]).toString().trim();
const SHOTS = process.env.SHOTS_DIR;

test("handwriting: print and cursive, tracing and writing are marked and the best mark is kept", async ({
  page,
}) => {
  test.setTimeout(120_000);
  try {
    await signInByEmail(page, "owner@demo.linguapath.test");
    await page.goto("/en/student/handwriting");
    await expect(page.locator("[data-how-to]")).toBeVisible();
    await expect(page.locator("[data-style='print']")).toBeVisible();
    await page.locator("[data-style='cursive']").click();
    // Cursive has the joined letters of the booklet; print does not.
    await expect(page.locator("[data-stage='joins'] [data-step]")).toHaveCount(51);
    await expect(page.locator("[data-stage='paragraphs'] [data-step]")).toHaveCount(6);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/hw1-steps.png`, fullPage: true });
    await page.locator("[data-step='L-a']").click();

    const pad = page.locator("[data-pad='trace'][data-ready='true']");
    await expect(pad).toBeVisible();
    // Nothing written yet: no mark, a reminder instead.
    await page.locator("[data-check]").click();
    await expect(page.locator("[data-mark='0']")).toContainText("Write on the page first");
    // A stroke far from the letters is marked low, with the reason.
    const box = (await pad.boundingBox())!;
    await page.mouse.move(box.x + box.width - 60, box.y + 12);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 20, box.y + 20, { steps: 6 });
    await page.mouse.up();
    await page.locator("[data-check]").click();
    await expect(page.locator("[data-tip='missed']")).toBeVisible();
    await page.locator("[data-clear]").click();
    // Ink exactly on the model (drawn here with the same letters) gets a high mark.
    await pad.evaluate((el) => {
      const ctx = el.querySelectorAll("canvas")[2]!.getContext("2d")!;
      ctx.font = (el as HTMLElement).dataset.font!;
      ctx.fillStyle = "#1d4ed8";
      ctx.fillText("Aa", 16, el.clientHeight * 0.66);
    });
    await page.locator("[data-check]").click();
    const mark = page.locator("[data-mark]");
    await expect(mark.locator("[data-tip='good']")).toBeVisible();
    expect(Number(await mark.getAttribute("data-mark"))).toBeGreaterThan(80);
    await expect(page.locator("[data-mode='trace'] [data-best]")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/hw2-trace.png`, fullPage: true });

    // Writing: the example above, an empty row below; small writing is told so.
    await page.locator("[data-mode='write']").click();
    const write = page.locator("[data-pad='write'][data-ready='true']");
    await expect(write).toBeVisible();
    await page.locator("[data-watch]").click();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/hw3-write.png`, fullPage: true });
    await write.evaluate((el) => {
      const ctx = el.querySelectorAll("canvas")[2]!.getContext("2d")!;
      // The same letters at a third of the size, in the empty row.
      ctx.font = (el as HTMLElement).dataset.font!.replace(
        /^[\d.]+px/,
        (m) => `${parseFloat(m) / 3}px`,
      );
      ctx.fillStyle = "#1d4ed8";
      ctx.fillText("Aa", 30, el.clientHeight * 0.75);
    });
    await page.locator("[data-check]").click();
    await expect(page.locator("[data-tip='small']")).toBeVisible();
    await expect(page.locator("[data-criterion='size']")).toBeVisible();
    await page.locator("[data-next-step]").click();
    await expect(page).toHaveURL(/handwriting\/cursive\/L-b$/);
    expect(sql("select count(*) from handwriting_progress")).toBe("2");
  } finally {
    sql("delete from handwriting_progress");
  }
});
