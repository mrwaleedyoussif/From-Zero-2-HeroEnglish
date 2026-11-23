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

export const gradeSchema = z.object({
  school_id: z.guid(),
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,4}$/i),
  name_en: name,
  name_ar: name,
  sort_order: z.coerce.number().int().min(0).max(20).default(0),
});

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
