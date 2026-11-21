/**
 * Diff incoming sheet rows against what the database holds (SPEC §6 preview):
 * new / changed (with the changed columns) / unchanged. Pure.
 */
export type Comparable = Record<string, string | number | boolean | null | readonly string[]>;

export interface SheetDiff {
  created: string[];
  changed: { key: string; fields: string[] }[];
  unchanged: number;
  /** Rows in the database but not in the sheet: never deleted, just reported. */
  notInSheet: number;
}

function same(a: Comparable[string] | undefined, b: Comparable[string] | undefined): boolean {
  const norm = (v: Comparable[string] | undefined) => {
    if (v === undefined || v === null || v === "") return "";
    if (Array.isArray(v)) return v.join(";");
    return String(v);
  };
  return norm(a) === norm(b);
}

export function diffRecords(
  existing: ReadonlyMap<string, Comparable>,
  incoming: readonly { key: string; record: Comparable }[],
): SheetDiff {
  const created: string[] = [];
  const changed: { key: string; fields: string[] }[] = [];
  let unchanged = 0;
  const seen = new Set<string>();
  for (const { key, record } of incoming) {
    seen.add(key);
    const current = existing.get(key);
    if (!current) {
      created.push(key);
      continue;
    }
    const fields = Object.keys(record).filter((f) => !same(record[f], current[f]));
    if (fields.length) changed.push({ key, fields });
    else unchanged++;
  }
  const notInSheet = [...existing.keys()].filter((k) => !seen.has(k)).length;
  return { created, changed, unchanged, notInSheet };
}
