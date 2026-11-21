/**
 * npm run calibrate [-- --apply] — monthly item calibration (SPEC §7).
 * For each question with ≥ 200 scored answers: re-estimate its Rasch difficulty from the
 * learners' final θ, and flag misfit / too hard / too easy for the Owner to review.
 * Default is a dry run that only prints; --apply saves `items.b_calibrated`.
 * Runs with the app's env (service role). Phase 8's scheduler will run it monthly.
 */
import { parseArgs } from "node:util";
import {
  calibrateItem,
  type CalibrationResponse,
  MIN_RESPONSES,
} from "@/features/placement/engine/calibration";
import { itemB } from "@/features/placement/engine/rasch";
import { createAdminClient } from "@/lib/supabase/admin";

const { values } = parseArgs({ options: { apply: { type: "boolean", default: false } } });
const db = createAdminClient();

const byItem = new Map<string, CalibrationResponse[]>();
for (let from = 0; ; from += 1000) {
  const { data, error } = await db
    .from("responses")
    .select("item_id, correct, test_sessions!inner(theta, status)")
    .not("correct", "is", null)
    .eq("test_sessions.status", "completed")
    .range(from, from + 999);
  if (error) throw error;
  for (const r of data) {
    const theta = r.test_sessions?.theta;
    if (theta === null || theta === undefined || r.correct === null) continue;
    const list = byItem.get(r.item_id) ?? [];
    list.push({ theta: Number(theta), correct: r.correct });
    byItem.set(r.item_id, list);
  }
  if (data.length < 1000) break;
}

const ready = [...byItem.entries()].filter(([, rs]) => rs.length >= MIN_RESPONSES);
console.log(
  `${byItem.size} questions answered; ${ready.length} have ≥ ${MIN_RESPONSES} answers.\n`,
);
if (ready.length === 0) process.exit(0);

const { data: items } = await db
  .from("items")
  .select("id, code, difficulty, b_calibrated")
  .in(
    "id",
    ready.map(([id]) => id),
  );
let flagged = 0;
for (const item of items ?? []) {
  const result = calibrateItem(
    byItem.get(item.id) ?? [],
    itemB({ ...item, b_calibrated: item.b_calibrated === null ? null : Number(item.b_calibrated) }),
  );
  if (!result) continue;
  if (result.flags.length) flagged++;
  console.log(
    `${item.code.padEnd(18)} n=${String(result.n).padStart(5)}  p=${result.pValue.toFixed(2)}  b=${result.b ?? "—"}  infit=${result.infit ?? "—"}  outfit=${result.outfit ?? "—"}  ${result.flags.join(", ")}`,
  );
  if (values.apply && result.b !== null) {
    await db.from("items").update({ b_calibrated: result.b }).eq("id", item.id);
  }
}
console.log(
  `\n${flagged} flagged for review.${values.apply ? " New difficulties saved." : " Dry run: nothing saved (use --apply)."}`,
);
