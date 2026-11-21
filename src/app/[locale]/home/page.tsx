import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignedInHeader } from "@/features/auth/components/signed-in-header";
import { consoleSections } from "@/features/owner/sections";
import { Link } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import { loadAuthority } from "@/lib/auth/authority";
import { requireActor } from "@/lib/auth/guard";

/** Temporary landing until gates arrive (Phase 2). */
export default async function HomePage({ params }: PageProps<"/[locale]/home">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requireActor(locale);
  const t = await getTranslations("Landing");
  const tc = await getTranslations("Console");
  const authority = await loadAuthority(actor.effective.id);
  const roleKeys = [...new Set(authority.roles.map((r) => r.roleKey))];
  const sections = [];
  for (const s of consoleSections) if (await canSomewhere(actor, s.permission)) sections.push(s);

  return (
    <div className="flex flex-1 flex-col">
      <SignedInHeader actor={actor} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-bold">{t("welcome", { name: actor.effective.full_name })}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t("yourRoles")}</CardTitle>
            <CardDescription>{t("comingSoon")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {roleKeys.length === 0 && <span className="text-muted-foreground">{t("noRoles")}</span>}
            {roleKeys.map((key) => (
              <Badge key={key} variant="secondary">
                {key}
              </Badge>
            ))}
          </CardContent>
        </Card>
        {sections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{tc("title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {sections.map((s) => (
                <Button key={s.href} asChild variant="outline">
                  <Link href={s.href}>{tc(`nav.${s.key}`)}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
