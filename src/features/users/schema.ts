import { z } from "zod";
import { scopeTypes } from "@/lib/auth/engine";
import { usernameSchema } from "@/lib/auth/student-identity";

/** Scope pickers submit "type:id" (e.g. "class:<uuid>", "platform:"). */
export const scopeValueSchema = z.string().transform((v, ctx) => {
  const [type, id = ""] = v.split(":");
  const parsedType = z.enum(scopeTypes).safeParse(type);
  if (!parsedType.success) {
    ctx.addIssue({ code: "custom", message: "scope" });
    return z.NEVER;
  }
  const needsId = parsedType.data !== "platform" && parsedType.data !== "self";
  if (needsId !== z.guid().safeParse(id).success) {
    ctx.addIssue({ code: "custom", message: "scope" });
    return z.NEVER;
  }
  return { type: parsedType.data, id: needsId ? id : null };
});

export const fullNameSchema = z.string().trim().min(2).max(120);
const optionalUuid = z.preprocess((v) => (v === "" ? undefined : v), z.guid().optional());

export const inviteStaffSchema = z.object({
  email: z.email().trim().toLowerCase(),
  full_name: fullNameSchema,
  school_id: optionalUuid,
  role_id: z.guid(),
  scope: scopeValueSchema,
  locale: z.enum(["en", "ar"]).default("en"),
});

export const createStudentSchema = z.object({
  school_id: z.guid(),
  class_id: optionalUuid,
  full_name: fullNameSchema,
  username: z.preprocess((v) => (v === "" ? undefined : v), usernameSchema.optional()),
  consent: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const assignRoleSchema = z.object({
  user_id: z.guid(),
  role_id: z.guid(),
  scope: scopeValueSchema,
});

export const overrideSchema = z.object({
  user_id: z.guid(),
  permission_key: z.string().regex(/^[a-z_]+:[a-z_:]+$/),
  effect: z.enum(["allow", "deny"]),
  scope: scopeValueSchema,
  expires_at: z.preprocess((v) => (v === "" || v == null ? null : v), z.iso.date().nullable()),
  reason: z.string().trim().max(200).optional(),
});

export const idSchema = z.object({ id: z.guid() });
export const userIdSchema = z.object({ user_id: z.guid() });
