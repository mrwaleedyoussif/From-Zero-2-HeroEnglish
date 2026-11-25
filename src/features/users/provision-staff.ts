import "server-only";
import { ActionError, check } from "@/lib/action-result";
import { authEmail, ownAuthMail, sendAuthMail } from "@/lib/auth/auth-mail";
import { publicEnv } from "@/lib/env.public";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { authError, withAuthUser } from "./provision";

type Db = Awaited<ReturnType<typeof createClient>>;

export interface NewStaff {
  email: string;
  fullName: string;
  schoolId: string | null;
  locale: "en" | "ar";
  /** true = send Supabase's invite email now; false = create silently (they use the sign-in page). */
  sendInvite: boolean;
}

/**
 * `grant` (the person's first role) runs inside the rollback: if RLS refuses the role, no
 * half-made account is left behind to block a second try.
 */
export async function provisionStaff(
  db: Db,
  s: NewStaff,
  grant?: (id: string) => Promise<void>,
): Promise<string> {
  const admin = createAdminClient();
  const redirectTo = `${publicEnv().NEXT_PUBLIC_APP_URL}/auth/callback?locale=${s.locale}`;
  const data = { full_name: s.fullName };
  // With a real mail service the app sends the invitation itself (Supabase's built-in sender
  // only reaches the project's own team): Supabase makes the account and the one-time link.
  const own = s.sendInvite && ownAuthMail();
  let link: string | undefined;
  return withAuthUser(
    async () => {
      if (own) {
        const made = await admin.auth.admin.generateLink({
          type: "invite",
          email: s.email,
          options: { redirectTo, data },
        });
        if (made.error || !made.data.user) authError(made.error);
        link = made.data.properties?.action_link;
        return { id: made.data.user.id };
      }
      const made = s.sendInvite
        ? await admin.auth.admin.inviteUserByEmail(s.email, { redirectTo, data })
        : await admin.auth.admin.createUser({
            email: s.email,
            email_confirm: true,
            user_metadata: data,
          });
      if (made.error || !made.data.user) authError(made.error);
      return { id: made.data.user.id };
    },
    async (uid) => {
      check(
        await db.from("profiles").insert({
          id: uid,
          school_id: s.schoolId,
          kind: "staff",
          full_name: s.fullName,
          email: s.email,
          locale: s.locale,
        }),
      );
      await grant?.(uid);
      if (own) {
        // Last, so a failed email leaves no account behind (the rollback removes it).
        if (!link) throw new ActionError("emailNotSent");
        try {
          await sendAuthMail(authEmail("invite", s.email, link, s.locale, s.fullName));
        } catch {
          throw new ActionError("emailNotSent");
        }
      }
      return uid;
    },
  );
}
