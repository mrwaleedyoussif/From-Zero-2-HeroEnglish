import Papa from "papaparse";
import { z } from "zod";
import { schoolCodeSchema, usernameSchema } from "@/lib/auth/student-identity";

/** Columns from docs/DATA_TEMPLATES.md → "Users import". */
export const IMPORT_COLUMNS = [
  "school_code",
  "role",
  "username",
  "full_name",
  "email",
  "grade",
  "class",
  "language",
  "consent",
] as const;

export const MAX_IMPORT_ROWS = 300;

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const importRowSchema = z.object({
  school_code: schoolCodeSchema,
  role: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{1,40}$/),
  username: z.preprocess(blank, usernameSchema.optional()),
  full_name: z.string().trim().min(2).max(120),
  email: z.preprocess(blank, z.email().trim().toLowerCase().optional()),
  grade: z.preprocess(
    blank,
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{1,4}$/)
      .optional(),
  ),
  class: z.preprocess(
    blank,
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{1,8}$/)
      .optional(),
  ),
  language: z.preprocess(blank, z.enum(["en", "ar"]).optional()),
  consent: z.preprocess(
    (v) =>
      typeof v === "string"
        ? ["yes", "y", "true", "1", "نعم"].includes(v.trim().toLowerCase())
        : false,
    z.boolean(),
  ),
});

export type ImportRow = z.infer<typeof importRowSchema>;

export type ParsedRow =
  | { line: number; ok: true; data: ImportRow }
  | { line: number; ok: false; errors: string[]; raw: Record<string, string> };

export interface ParseResult {
  rows: ParsedRow[];
  /** Problems with the file itself (missing columns, too many rows). */
  fileErrors: string[];
}

/** Parse + validate a users CSV. Line numbers match a spreadsheet (header = line 1). */
export function parseImportCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const fileErrors: string[] = [];
  const headers = parsed.meta.fields ?? [];
  for (const col of IMPORT_COLUMNS)
    if (!headers.includes(col)) fileErrors.push(`missingColumn:${col}`);
  if (parsed.data.length > MAX_IMPORT_ROWS) fileErrors.push(`tooManyRows:${MAX_IMPORT_ROWS}`);
  if (fileErrors.length) return { rows: [], fileErrors };

  const seenUsernames = new Set<string>();
  const seenEmails = new Set<string>();
  const rows = parsed.data.map((raw, i): ParsedRow => {
    const line = i + 2;
    const result = importRowSchema.safeParse(raw);
    if (!result.success) {
      return {
        line,
        ok: false,
        raw,
        errors: [...new Set(result.error.issues.map((e) => String(e.path[0])))],
      };
    }
    const d = result.data;
    const errors: string[] = [];
    if (!d.username && !d.email) errors.push("usernameOrEmail");
    if (d.class && !d.grade) errors.push("grade");
    const userKey = d.username ? `${d.school_code}/${d.username}` : null;
    if (userKey && seenUsernames.has(userKey)) errors.push("duplicateInFile");
    if (d.email && seenEmails.has(d.email)) errors.push("duplicateInFile");
    if (userKey) seenUsernames.add(userKey);
    if (d.email) seenEmails.add(d.email);
    return errors.length ? { line, ok: false, raw, errors } : { line, ok: true, data: d };
  });
  return { rows, fileErrors };
}
