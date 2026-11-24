import { z } from "zod";

export const localeSchema = z.enum(["en", "ar"]);
export const emailSchema = z.email().trim().toLowerCase().max(254);
/** The one-time code from the email (6 digits by default; Supabase allows up to 10). */
export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/);

export const inviteCodeSchema = z.string().regex(/^[A-Z0-9]{6,12}$/);

const ticked = z.literal("on");
/** First visit: who they are, that they are an adult, and that they accept the terms. */
export const welcomeSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  adult: ticked,
  terms: ticked,
  /** Invitation code from the Owner; without one the request waits for approval. */
  invite: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined),
    inviteCodeSchema.optional(),
  ),
  locale: localeSchema,
});

export const inviteSchema = z.object({
  label: z.string().trim().min(1).max(80),
  max_uses: z.coerce.number().int().min(1).max(100000),
  expires_on: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.iso.date().optional()),
});
