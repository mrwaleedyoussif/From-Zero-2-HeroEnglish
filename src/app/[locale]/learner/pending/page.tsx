import { MailCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { Link } from "@/i18n/navigation";

/** After a sign-up without an invitation code: the request is with the Owner. */
export default async function LearnerPendingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/learner/pending">) {
  const { locale } = await params;
  const over = (await searchParams).trial === "over";
  setRequestLocale(locale);
  const t = await getTranslations("Learner");
  return (
    <AuthShell
      tone="mint"
      icon={<MailCheck className="size-7" />}
      title={t(over ? "trialOverTitle" : "pendingTitle")}
      description={t(over ? "trialOverIntro" : "pendingIntro")}
      footer={
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          {t("backHome")}
        </Link>
      }
    >
      <p className="text-sm">{t("pendingNext")}</p>
    </AuthShell>
  );
}
