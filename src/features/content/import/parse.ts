import type { z } from "zod";

/** One problem in one cell, shown to the Owner as "Questions, row 7, difficulty: must be 1–10". */
export interface ImportIssue {
  sheet: string;
  /** Spreadsheet row number (header = 1). 0 = the sheet itself. */
  line: number;
  column: string;
  code: string;
  params?: Record<string, string>;
  /** The id in that row, when known. */
  key?: string;
  /** A warning is shown but does not stop the row from importing. */
  warning?: boolean;
}

export interface ParsedRow<T> {
  line: number;
  key: string;
  data: T;
}

export interface ParsedSheet<T> {
  rows: ParsedRow<T>[];
  issues: ImportIssue[];
}

/** "range:1:10" → { code: "range", params: { min: "1", max: "10" } } */
export function decodeMessage(message: string): { code: string; params?: Record<string, string> } {
  const [codePart = "invalid", ...rest] = message.split(":");
  if (codePart === "range")
    return { code: "range", params: { min: rest[0] ?? "", max: rest[1] ?? "" } };
  if (codePart === "oneOf")
    return { code: "oneOf", params: { values: (rest[0] ?? "").split("|").join(", ") } };
  if (/^[a-zA-Z]+$/.test(codePart)) return { code: codePart };
  return { code: "invalid" };
}

/** Validate a sheet (header row + data rows) against its schema; duplicate ids are errors too. */
export function parseSheet<S extends z.ZodObject>(
  sheet: string,
  schema: S,
  keyOf: (row: z.infer<S>) => string,
  cells: string[][],
): ParsedSheet<z.infer<S>> {
  const [header = [], ...body] = cells;
  const columns = header.map((h) => h.trim().toLowerCase());
  const expected = Object.keys(schema.shape);
  const missing = expected.filter((c) => !columns.includes(c));
  if (missing.length) {
    return {
      rows: [],
      issues: missing.map((column) => ({ sheet, line: 1, column, code: "missingColumn" })),
    };
  }

  const rows: ParsedRow<z.infer<S>>[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Map<string, number>();
  body.forEach((cellsInRow, i) => {
    const line = i + 2;
    if (cellsInRow.every((c) => !c || !c.trim())) return; // blank row
    const raw = Object.fromEntries(columns.map((c, j) => [c, cellsInRow[j] ?? ""]));
    const parsed = schema.safeParse(raw);
    const rawKey = String(raw[expected[0] ?? ""] ?? "").trim() || undefined;
    if (!parsed.success) {
      const byColumn = new Map<string, ImportIssue>();
      for (const issue of parsed.error.issues) {
        const column = String(issue.path[0] ?? expected[0] ?? "");
        if (!byColumn.has(column))
          byColumn.set(column, {
            sheet,
            line,
            column,
            key: rawKey,
            ...decodeMessage(issue.message),
          });
      }
      issues.push(...byColumn.values());
      return;
    }
    const key = keyOf(parsed.data);
    const first = seen.get(key);
    if (first !== undefined) {
      issues.push({
        sheet,
        line,
        column: expected[0] ?? "",
        code: "duplicateId",
        params: { line: String(first) },
        key,
      });
      return;
    }
    seen.set(key, line);
    rows.push({ line, key, data: parsed.data });
  });
  return { rows, issues };
}
