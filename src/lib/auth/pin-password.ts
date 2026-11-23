import "server-only";
import { createHmac } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * What Supabase stores as a student's password is not the PIN but a keyed hash of it. A 6-digit
 * PIN on its own could be guessed by calling the sign-in service directly, past the app's
 * attempt limits; without the server's key such calls can't even form a valid password.
 * The key comes from ENCRYPTION_KEY: if that key is ever replaced, every student needs a new PIN
 * (print new login cards).
 */
export function pinPassword(email: string, pin: string): string {
  const key = Buffer.from(serverEnv().ENCRYPTION_KEY, "base64");
  const mac = createHmac("sha256", key).update(`student-pin:${email.toLowerCase()}:${pin}`);
  return `pin1.${mac.digest("base64url")}`;
}
