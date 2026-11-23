import type { ReactNode } from "react";
import { getActor } from "@/lib/auth/session";
import { learnerProfile } from "../profile/queries";

/**
 * Applies what the learner chose in their profile to the student portal: the easy-to-read
 * font (SPEC §16). Extra test time is applied by the placement runtime.
 */
export async function Accommodations({ children }: { children: ReactNode }) {
  const actor = await getActor();
  const profile = actor ? await learnerProfile(actor.effective.id) : null;
  const easyFont = profile?.accommodations.includes("dyslexia_font");
  return (
    <div data-font={easyFont ? "dyslexia" : undefined} className="contents">
      {children}
    </div>
  );
}
