import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { StaffLoginForm } from "@/features/auth/components/staff-login-form";
import { Link } from "@/i18n/navigation";

const knownErrors = ["link_invalid", "no_account", "google_unavailable"] as const;

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  const { error } = await searchParams;
  const known = knownErrors.find((e) => e === error);

  return (
    <AuthShell
      title={t("staffTitle")}
      description={t("staffIntro")}
      footer={
        <Link href="/student-login" className="text-primary underline-offset-4 hover:underline">
          {t("studentLink")}
        </Link>
      }
    >
      {known && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${known}`)}
        </p>
      )}
      <StaffLoginForm />
    </AuthShell>
  );
}
