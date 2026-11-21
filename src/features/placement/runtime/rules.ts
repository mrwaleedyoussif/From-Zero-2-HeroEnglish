/** Pure rules for starting a test (SPEC §7 retake policy, progress checks) and grade bands. */

export type GradeBand = "K-2" | "3-5" | "6-8" | "9-12";
const BANDS: readonly GradeBand[] = ["K-2", "3-5", "6-8", "9-12"];

/** School grade code ("K", "KG", "4", "11") → content grade band; unknown → null. */
export function gradeBand(code: string | null | undefined): GradeBand | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (c === "K" || c === "KG" || c === "PK") return "K-2";
  const n = Number(c);
  if (!Number.isInteger(n) || n < 0 || n > 12) return null;
  if (n <= 2) return "K-2";
  if (n <= 5) return "3-5";
  if (n <= 8) return "6-8";
  return "9-12";
}

/** Bands an adaptive test may use: the learner's own and the neighbours (it must reach above/below). */
export function allowedBands(band: GradeBand | null): Set<string> | null {
  if (!band) return null;
  const i = BANDS.indexOf(band);
  return new Set(BANDS.filter((_, j) => Math.abs(j - i) <= 1));
}

export type StartDecision =
  | { ok: true; resume: string | null; windowId: string | null }
  | { ok: false; reason: "cooldown"; until: Date }
  | { ok: false; reason: "needRetake" | "noWindow" | "doneInWindow" };

export interface StartFacts {
  kind: "placement" | "progress";
  now: Date;
  /** An unfinished session to resume. */
  openSessionId: string | null;
  lastCompletedAt: Date | null;
  cooldownDays: number;
  hasUnusedRetake: boolean;
  /** Progress checks: the open window for the learner's class, and whether it's done. */
  openWindowId: string | null;
  doneInWindow: boolean;
}

/**
 * Placement: first attempt is free; a retake needs a teacher's grant AND the cooldown to have
 * passed. Progress check: only while a teacher's window is open, once per window.
 */
export function decideStart(f: StartFacts): StartDecision {
  if (f.openSessionId) return { ok: true, resume: f.openSessionId, windowId: null };
  if (f.kind === "progress") {
    if (!f.openWindowId) return { ok: false, reason: "noWindow" };
    if (f.doneInWindow) return { ok: false, reason: "doneInWindow" };
    return { ok: true, resume: null, windowId: f.openWindowId };
  }
  if (!f.lastCompletedAt) return { ok: true, resume: null, windowId: null };
  const until = new Date(f.lastCompletedAt.getTime() + f.cooldownDays * 86_400_000);
  if (f.now < until) return { ok: false, reason: "cooldown", until };
  if (!f.hasUnusedRetake) return { ok: false, reason: "needRetake" };
  return { ok: true, resume: null, windowId: null };
}

/** Elapsed whole seconds since a timestamp (for the stopping rule's time limit). */
export function elapsedSec(since: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / 1000));
}
