import { KeyRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SetPasswordForm } from "@/features/auth/components/password-forms";
import { Link, redirect } from "@/i18n/navigation";
import { requireActor } from "@/lib/auth/guard";

/** A member of staff's own account: set the password for quicker sign-in. */
export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requireActor(locale);
  // Students sign in with their school code and PIN; they have no password to set.
  if (actor.real.kind !== "staff") return redirect({ href: "/home", locale });
  const t = await getTranslations("Auth");

  return (
    <AuthShell
      tone="sky"
      icon={<KeyRound className="size-7" />}
      title={t("accountTitle")}
      description={t("accountIntro", { email: actor.real.email ?? "" })}
      footer={
        <Link href="/home" className="text-primary underline-offset-4 hover:underline">
          {t("accountBack")}
        </Link>
      }
    >
      <SetPasswordForm />
    </AuthShell>
  );
}
