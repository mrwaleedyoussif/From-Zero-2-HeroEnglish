import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** 404 inside a locale (unknown page, or a record the viewer may not see — never says which). */
export default async function NotFound() {
  const t = await getTranslations("ErrorPages");
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl" aria-hidden>
        🧭
      </p>
      <h1 className="text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("notFoundBody")}</p>
      <Button asChild>
        <Link href="/home">{t("home")}</Link>
      </Button>
    </main>
  );
}
