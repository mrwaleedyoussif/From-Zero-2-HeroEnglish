/** Pure dashboard helpers (SPEC §11): at-risk rules, CEFR distribution, growth, CSV export. */

export const CEFR_LEVELS = ["PreA1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type RiskFlag = "inactive" | "falling" | "overdue";

export interface RiskInput {
  last_active_at: string | null;
  overdue: number;
  accuracy_7d: number | null;
  accuracy_prev: number | null;
}

/** Days without activity, accuracy drop (points) and overdue count that flag a learner. */
export const RISK = { inactiveDays: 7, accuracyDrop: 15 } as const;

export function riskFlags(s: RiskInput, now: Date): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const last = s.last_active_at ? Date.parse(s.last_active_at) : null;
  if (last === null || now.getTime() - last > RISK.inactiveDays * 86_400_000)
    flags.push("inactive");
  if (
    s.accuracy_7d !== null &&
    s.accuracy_prev !== null &&
    Number(s.accuracy_7d) < Number(s.accuracy_prev) - RISK.accuracyDrop
  )
    flags.push("falling");
  if (s.overdue > 0) flags.push("overdue");
  return flags;
}

/** Counts per CEFR level in level order, with "none" (not placed yet) last. */
export function cefrDistribution(rows: readonly { cefr: string; n: number }[]) {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.cefr, (totals.get(r.cefr) ?? 0) + r.n);
  return [...CEFR_LEVELS, "none"]
    .map((cefr) => ({ cefr, n: totals.get(cefr) ?? 0 }))
    .filter((r) => r.n > 0);
}

/** Average θ growth of a group minus the school's, in logits (null without data). */
export function growthVsAverage(
  group: readonly (number | null)[],
  school: readonly (number | null)[],
): { group: number | null; school: number | null; diff: number | null } {
  const avg = (xs: readonly (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null && Number.isFinite(x));
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
  };
  const g = avg(group);
  const s = avg(school);
  return {
    group: g,
    school: s,
    diff: g === null || s === null ? null : Math.round((g - s) * 100) / 100,
  };
}

/**
 * CSV for spreadsheet apps: UTF-8 BOM (Arabic opens correctly in Excel), quoted cells, and
 * formula-like cells prefixed with ' so a name like "=HYPERLINK(...)" can't run (CSV injection).
 */
export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Text only: a negative number is data, not a spreadsheet formula.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${[headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}
