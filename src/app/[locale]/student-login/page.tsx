import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { StudentLoginForm } from "@/features/auth/components/student-login-form";
import { Link } from "@/i18n/navigation";

export default async function StudentLoginPage({ params }: PageProps<"/[locale]/student-login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <AuthShell
      theme="student"
      title={t("studentTitle")}
      description={t("studentIntro")}
      footer={
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          {t("staffLink")}
        </Link>
      }
    >
      <StudentLoginForm />
    </AuthShell>
  );
}
