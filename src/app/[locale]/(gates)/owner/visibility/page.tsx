import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { CheckUser } from "@/features/visibility/components/check-user";
import { FlagsCard } from "@/features/visibility/components/flags-card";
import { KeyPicker } from "@/features/visibility/components/key-picker";
import { RulesCard } from "@/features/visibility/components/rules-card";
import { WhoSees } from "@/features/visibility/components/who-sees";
import { studioData } from "@/features/visibility/queries";
import { subjectOptions } from "@/features/visibility/subjects";
import { requirePermission } from "@/lib/auth/guard";
import { isKnownKey, registryEntry } from "@/lib/registry";

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** Visibility Studio (SPEC §4): choose a key, see who sees it, change it per subject. */
export default async function VisibilityPage({
  params,
  searchParams,
}: PageProps<"/[locale]/owner/visibility">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "visibility:manage", "page.owner.visibility");
  const t = await getTranslations("Visibility");
  const tr = await getTranslations("Registry");
  const sp = await searchParams;
  const q = str(sp.q);
  const requested = str(sp.key);
  const key = requested && isKnownKey(requested) ? requested : null;
  const data = await studioData(key);
  const subjects = subjectOptions(
    data,
    {
      user: t("subjects.user"),
      class: t("subjects.class"),
      grade: t("subjects.grade"),
      school: t("subjects.school"),
      role: t("subjects.role"),
      plan: t("subjects.plan"),
    },
    locale,
  );
  const entry = key ? registryEntry(key) : undefined;

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <KeyPicker q={q} selected={key} />
        <div className="flex min-w-0 flex-col gap-6">
          {!key && <p className="text-muted-foreground">{t("pickKey")}</p>}
          {key && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{entry ? tr(key) : key}</h2>
                <code dir="ltr" className="text-sm text-muted-foreground">
                  {key}
                </code>
                <Badge variant="outline">
                  {t(entry?.defaultVisible === false ? "defaultHidden" : "defaultShown")}
                </Badge>
              </div>
              {actor.viewAs ? (
                <p>{t("readOnly")}</p>
              ) : (
                <RulesCard targetKey={key} data={data} subjects={subjects} />
              )}
              <WhoSees targetKey={key} data={data} />
              <CheckUser targetKey={key} query={str(sp.user)} />
            </>
          )}
          {!actor.viewAs && <FlagsCard data={data} subjects={subjects} />}
        </div>
      </div>
    </>
  );
}
