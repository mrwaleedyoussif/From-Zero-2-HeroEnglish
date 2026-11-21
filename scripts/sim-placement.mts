/**
 * npm run sim:placement — acceptance check for the adaptive placement engine (SPEC §7).
 * Simulated learners at θ = −2, 0, +2 and θ ~ N(0,1) take the CAT on a bank built like the
 * Owner's content (difficulty 1–10, 4 skills). Passes when no test is longer than 25 items and
 * the mean absolute error is < 0.4 logits for the realistic population (θ ~ N(0,1)) and across
 * all simulated learners. The ±2 groups are printed too: there the SPEC's Normal(θ₀, 1) prior
 * pulls estimates toward θ₀ (≈0.3 logits at 25 items), which a grade-band or previous-test θ₀
 * reduces in real use.
 *
 * Options: --items 300 (bank size)  --max 25  --learners 300  --seed 42
 */
import { parseArgs } from "node:util";
import { mulberry32 } from "../src/features/placement/engine/rng.ts";
import { makeBank, runSimulation } from "../src/features/placement/engine/simulate.ts";
import type { Blueprint } from "../src/features/placement/engine/types.ts";

const { values } = parseArgs({
  options: {
    items: { type: "string", default: "300" },
    max: { type: "string", default: "25" },
    learners: { type: "string", default: "300" },
    seed: { type: "string", default: "42" },
  },
});
const MAE_LIMIT = 0.4;
const maxItems = Number(values.max);
const rng = mulberry32(Number(values.seed));
const shares = { READ: 0.25, LIST: 0.2, GRAM: 0.2, VOC: 0.15 };
const bank = makeBank(Number(values.items), Object.keys(shares), rng);
const blueprint: Blueprint = {
  minItems: 12,
  maxItems,
  targetSe: 0.35,
  timeLimitSec: null,
  skillMinShares: shares,
};

const groups = runSimulation(bank, blueprint, rng, Number(values.learners));
console.log(
  `LinguaPath placement simulation — bank ${bank.length} items, max ${maxItems} items, seed ${values.seed}\n`,
);
console.log("group         learners   MAE    mean items  max items  mean SE");
for (const g of groups) {
  console.log(
    `${g.label.padEnd(13)} ${String(g.learners).padStart(8)}  ${g.mae.toFixed(3)}  ${g.meanItems.toFixed(1).padStart(10)}  ${String(g.maxItems).padStart(9)}  ${g.meanSe.toFixed(3)}`,
  );
}
const population = groups.find((g) => g.label.startsWith("θ ~"));
const overall =
  groups.reduce((sum, g) => sum + g.mae * g.learners, 0) /
  groups.reduce((n, g) => n + g.learners, 0);
const longest = Math.max(...groups.map((g) => g.maxItems));
const pass = (population?.mae ?? 1) < MAE_LIMIT && overall < MAE_LIMIT && longest <= 25;
console.log(
  `\nPopulation MAE ${population?.mae.toFixed(3)} · all learners ${overall.toFixed(3)} (limit < ${MAE_LIMIT}) · longest test ${longest} items (limit ≤ 25): ${pass ? "PASS" : "FAIL"}`,
);
process.exit(pass ? 0 : 1);
