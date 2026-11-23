import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LearnerForm } from "@/features/learners/components/learner-form";
import { Link } from "@/i18n/navigation";
import { learnersOpen } from "@/features/learners/general";

/** General learners (outside a school): sign in or join with an emailed one-time code. */
export default async function LearnerPage({ params }: PageProps<"/[locale]/learner">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Learner");
  const open = learnersOpen();

  return (
    <AuthShell
      theme="student"
      title={t("title")}
      description={open ? t("intro") : t("errors.closed")}
      footer={
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          {t("schoolLink")}
        </Link>
      }
    >
      {open && <LearnerForm />}
    </AuthShell>
  );
}
