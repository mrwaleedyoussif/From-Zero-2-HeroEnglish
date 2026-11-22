/** Levels (SPEC §10): XP thresholds from the `levels` table, e.g. Explorer → Legend. */

export interface Level {
  level: number;
  name_en: string;
  name_ar: string;
  xp_required: number;
}

export interface LevelStatus {
  current: Level | null;
  next: Level | null;
  /** 0–1 progress from the current threshold to the next (1 at the top level). */
  progress: number;
}

const sorted = (levels: readonly Level[]) =>
  [...levels].sort((a, b) => a.xp_required - b.xp_required);

export function levelFor(xp: number, levels: readonly Level[]): LevelStatus {
  const list = sorted(levels);
  let current: Level | null = null;
  let next: Level | null = null;
  for (const l of list) {
    if (xp >= l.xp_required) current = l;
    else {
      next = l;
      break;
    }
  }
  if (!next) return { current, next: null, progress: 1 };
  const from = current?.xp_required ?? 0;
  return { current, next, progress: (xp - from) / (next.xp_required - from) };
}

/** Levels newly reached when XP goes from `before` to `after` (for level-up celebrations). */
export function levelsCrossed(before: number, after: number, levels: readonly Level[]): Level[] {
  return sorted(levels).filter((l) => l.xp_required > before && l.xp_required <= after);
}
