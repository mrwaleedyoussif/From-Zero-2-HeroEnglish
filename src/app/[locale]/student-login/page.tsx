import { GraduationCap } from "lucide-react";
import { SchoolBadge } from "@/features/home/components/school-badge";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { StudentLoginForm } from "@/features/auth/components/student-login-form";
import { Link } from "@/i18n/navigation";
import { schoolCodeSchema } from "@/lib/auth/student-identity";

export default async function StudentLoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/student-login">) {
  const { locale } = await params;
  // The home page passes the school the learner picked, so they need not type its code.
  const school = schoolCodeSchema.safeParse((await searchParams).school);
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <AuthShell
      tone="violet"
      icon={<GraduationCap className="size-7" />}
      badge={school.success ? <SchoolBadge code={school.data} locale={locale} /> : undefined}
      title={t("studentTitle")}
      description={t("studentIntro")}
      footer={
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          {t("staffLink")}
        </Link>
      }
    >
      <StudentLoginForm defaultSchool={school.success ? school.data : undefined} />
    </AuthShell>
  );
}
