import { z } from "zod";

export const localeSchema = z.enum(["en", "ar"]);
export const emailSchema = z.email().trim().toLowerCase().max(254);
/** The one-time code from the email (6 digits by default; Supabase allows up to 10). */
export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/);

const ticked = z.literal("on");
/** First visit: who they are, that they are an adult, and that they accept the terms. */
export const welcomeSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  adult: ticked,
  terms: ticked,
  locale: localeSchema,
});
