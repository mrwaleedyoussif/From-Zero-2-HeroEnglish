import { randomInt } from "node:crypto";
import { z } from "zod";

/** Students sign in with school code + username + PIN; Supabase sees a synthetic email (SPEC §2). */
export const schoolCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{3,12}$/);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{1,31}$/);

/** 6 digits: Supabase's minimum password length is 6. */
export const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/);

export const studentLoginSchema = z.object({
  schoolCode: schoolCodeSchema,
  username: usernameSchema,
  pin: pinSchema,
});

export function studentEmail(schoolCode: string, username: string): string {
  return `${usernameSchema.parse(username)}@${schoolCodeSchema.parse(schoolCode).toLowerCase()}.students.local`;
}

export function isStudentEmail(email: string): boolean {
  return email.endsWith(".students.local");
}

const weakPins = new Set(["000000", "111111", "123456", "654321", "123123", "121212"]);

/** Cryptographically random PIN, avoiding the most guessable ones. */
export function generatePin(): string {
  for (;;) {
    const pin = randomInt(0, 1_000_000).toString().padStart(6, "0");
    if (!weakPins.has(pin) && !/^(\d)\1{5}$/.test(pin)) return pin;
  }
}

/** Suggest a username from a full name: "Sara Khalid" → "sara.k" (Latin letters only). */
export function suggestUsername(fullName: string): string | null {
  const parts = fullName
    .normalize("NFKD")
    .replace(/[^\p{L}\s-]/gu, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const [first, second] = parts;
  if (!first || !/^[a-z-]+$/.test(first)) return null;
  const candidate = second && /^[a-z]/.test(second) ? `${first}.${second[0]}` : first;
  return usernameSchema.safeParse(candidate).success ? candidate : null;
}
