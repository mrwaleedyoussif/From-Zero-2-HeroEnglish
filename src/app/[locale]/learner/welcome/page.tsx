import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { WelcomeForm } from "@/features/learners/components/welcome-form";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

/** Shown once, right after a new learner's code is accepted. */
export default async function LearnerWelcomePage({
  params,
}: PageProps<"/[locale]/learner/welcome">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return redirect({ href: "/learner", locale });
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile) return redirect({ href: "/home", locale });
  const t = await getTranslations("Learner");

  return (
    <AuthShell theme="student" title={t("welcomeTitle")} description={t("welcomeIntro")}>
      <WelcomeForm />
    </AuthShell>
  );
}
