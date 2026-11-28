import { execFileSync } from "node:child_process";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { signInByEmail } from "./helpers";

const DB = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q: string) => execFileSync("psql", [DB, "-qtAc", q]).toString().trim();
const SHOTS = process.env.SHOTS_DIR;

/** Write with the mouse along the model's own strokes, optionally shrunk towards a corner. */
async function writeModel(page: Page, pad: Locator, k = 1) {
  const box = (await pad.boundingBox())!;
  const strokes = JSON.parse((await pad.getAttribute("data-model"))!) as [number, number][][];
  for (const st of strokes) {
    const pts = st.map(([x, y]) => [
      box.x + 30 + (x - 30) * k,
      box.y + box.height - (box.height - y) * k,
    ]);
    await page.mouse.move(pts[0]![0]!, pts[0]![1]!);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1)) await page.mouse.move(x!, y!);
    await page.mouse.up();
  }
}

test("handwriting: watch, trace and write with pen strokes; each try is marked and the best kept", async ({
  page,
}) => {
  test.setTimeout(120_000);
  try {
    await signInByEmail(page, "owner@demo.linguapath.test");
    await page.goto("/en/student/handwriting");
    await expect(page.locator("[data-how-to] [data-demo='ready']")).toBeVisible();
    await expect(page.locator("[data-style='print']")).toBeVisible();
    await page.locator("[data-style='cursive']").click();
    // Cursive has the joined letters of the booklet; print does not.
    await expect(page.locator("[data-stage='joins'] [data-step]")).toHaveCount(51);
    await expect(page.locator("[data-stage='paragraphs'] [data-step]")).toHaveCount(6);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/hw1-steps.png`, fullPage: true });
    await page.locator("[data-step='L-a']").click();

    // 1. Watch: the app writes it; then on to tracing.
    await expect(page.locator("[data-mode='watch']")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-demo='ready']")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/hw2-watch.png`, fullPage: true });
    await page.locator("[data-go='trace']").click();

    // 2. Trace. Nothing written yet: no mark, a reminder instead.
    const pad = page.locator("[data-pad='trace'][data-ready='true']");
    await expect(pad).toBeVisible();
    await page.locator("[data-check]").click();
    await expect(page.locator("[data-mark='0']")).toContainText("Write on the lines first");
    // A stroke far from the letters is marked low, with the reason.
    const box = (await pad.boundingBox())!;
    await page.mouse.move(box.x + box.width - 60, box.y + 12);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 20, box.y + 20, { steps: 6 });
    await page.mouse.up();
    await page.locator("[data-check]").click();
    await expect(page.locator("[data-tip='missed']")).toBeVisible();
    await page.locator("[data-clear]").click();
    // Following the model's strokes in order gets a high mark.
    await writeModel(page, pad);
    await page.locator("[data-check]").click();
    const mark = page.locator("[data-mark]");
    await expect(mark.locator("[data-tip='good']")).toBeVisible();
    expect(Number(await mark.getAttribute("data-mark"))).toBeGreaterThan(80);
    await expect(mark.locator("[data-criterion='direction']")).toContainText(/9\d%|100%/);
    await expect(page.locator("[data-mode='trace'] [data-best]")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/hw3-trace.png`, fullPage: true });

    // 3. Write: the example above, empty lines below; small writing is told so.
    await page.locator("[data-go='write']").click();
    const write = page.locator("[data-pad='write'][data-ready='true']");
    await expect(write).toBeVisible();
    await page.locator("[data-example] [data-watch]").click();
    await writeModel(page, write, 0.4);
    await page.locator("[data-check]").click();
    await expect(page.locator("[data-tip='small']")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/hw4-write.png`, fullPage: true });
    await page.locator("[data-next-step]").click();
    await expect(page).toHaveURL(/handwriting\/cursive\/L-b$/);
    expect(sql("select count(*) from handwriting_progress")).toBe("2");

    // Print handwriting works the same way, with separate letters; a paragraph fills several rows.
    await page.goto("/en/student/handwriting/print/P-01");
    await page.locator("[data-go='trace']").click();
    await expect(page.locator("[data-pad='trace'][data-ready='true']")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/hw5-print.png`, fullPage: true });
  } finally {
    sql("delete from handwriting_progress");
  }
});
