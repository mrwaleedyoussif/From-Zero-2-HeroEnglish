import { z } from "zod";
import { schoolCodeSchema } from "@/lib/auth/student-identity";
import { isTimeZone } from "@/lib/scheduler/plan";

const name = z.string().trim().min(1).max(120);

export const schoolSchema = z.object({
  code: schoolCodeSchema,
  name_en: name,
  name_ar: name,
  timezone: z.string().trim().min(1).default("Asia/Riyadh").refine(isTimeZone),
  week_start: z.coerce.number().int().min(0).max(6).default(0),
});

export const yearSchema = z
  .object({
    school_id: z.guid(),
    name: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/),
    starts_on: z.iso.date(),
    ends_on: z.iso.date(),
    is_current: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  })
  .refine((y) => y.ends_on > y.starts_on, { path: ["ends_on"] });

/** A grade's short code: "4", "11", "KG1". */
export const GRADE_CODE = /^[A-Z0-9]{1,4}$/i;

export const gradeSchema = z.object({
  school_id: z.guid(),
  code: z.string().trim().regex(GRADE_CODE),
  name_en: name,
  name_ar: name,
  sort_order: z.coerce.number().int().min(0).max(20).default(0),
});

/** Grades from..to in one go (e.g. 1 to 12), named "Grade 4" / "الصف الرابع". */
export const gradeRangeSchema = z
  .object({
    school_id: z.guid(),
    from: z.coerce.number().int().min(1).max(12),
    to: z.coerce.number().int().min(1).max(12),
  })
  .refine((r) => r.to >= r.from, { path: ["to"] });

const ORDINALS_AR = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
];

export function gradeRows(input: z.infer<typeof gradeRangeSchema>) {
  return Array.from({ length: input.to - input.from + 1 }, (_, i) => {
    const n = input.from + i;
    return {
      school_id: input.school_id,
      code: String(n),
      name_en: `Grade ${n}`,
      name_ar: `الصف ${ORDINALS_AR[n - 1]}`,
      sort_order: n,
    };
  });
}

export const classSchema = z.object({
  school_id: z.guid(),
  grade_id: z.guid(),
  year_id: z.guid(),
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{1,8}$/i),
  name: z.string().trim().max(80).optional(),
});

export function formObject(form: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(form.entries());
}
