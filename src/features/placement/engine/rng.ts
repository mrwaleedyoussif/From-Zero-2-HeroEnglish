/**
 * Seeded PRNG (mulberry32). Tests and the simulation are reproducible, and a test session
 * can resume after a disconnect and pick the same next item.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample (Box–Muller) from a uniform RNG. */
export function normal(rng: Rng, mean = 0, sd = 1): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** The RNG for step n of a session: same seed + same step → same choice after a reload. */
export function stepRng(sessionSeed: number, step: number): Rng {
  return mulberry32((sessionSeed ^ Math.imul(step + 1, 0x9e3779b1)) >>> 0);
}
