import { z } from "zod";
import { subjectTypes } from "@/lib/visibility/engine";

/** Subject pickers submit "type:id"; "user:" means "look up the typed user". */
export const subjectSchema = z.string().transform((v, ctx) => {
  const [type, id = ""] = v.split(":");
  const t = z.enum(subjectTypes).safeParse(type);
  if (!t.success || (t.data !== "user" && !z.guid().safeParse(id).success)) {
    ctx.addIssue({ code: "custom", message: "subject" });
    return z.NEVER;
  }
  return { type: t.data, id: id || null };
});

const optionalDateTime = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
    .transform((s) => new Date(s).toISOString())
    .nullable(),
);

export const ruleSchema = z
  .object({
    target_key: z.string().min(3).max(120),
    subject: subjectSchema,
    user: z.string().trim().max(120).optional(),
    effect: z.enum(["show", "hide"]),
    starts_at: optionalDateTime,
    ends_at: optionalDateTime,
    note: z.string().trim().max(200).optional(),
  })
  .refine((r) => !r.starts_at || !r.ends_at || r.ends_at > r.starts_at, { path: ["ends_at"] });
