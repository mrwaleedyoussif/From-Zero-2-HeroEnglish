import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignedInHeader } from "@/features/auth/components/signed-in-header";
import { enterableGates } from "@/gates/access";
import { redirect } from "@/i18n/navigation";
import { requireActor } from "@/lib/auth/guard";

/** Landing (SPEC §4): go to the highest-priority gate the user may enter. */
export default async function HomePage({ params }: PageProps<"/[locale]/home">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requireActor(locale);
  const [best] = await enterableGates(actor);
  if (best) redirect({ href: best.basePath, locale });

  const t = await getTranslations("Landing");
  return (
    <div className="flex flex-1 flex-col">
      <SignedInHeader actor={actor} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>{t("welcome", { name: actor.effective.full_name })}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">{t("noGate")}</CardContent>
        </Card>
      </main>
    </div>
  );
}
