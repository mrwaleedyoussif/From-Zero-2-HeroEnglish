import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { PublicSidebar } from "@/components/public-sidebar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { HomeExperience } from "@/features/home/components/home-experience";
import { HOME_KEYS, type HomeCopy } from "@/features/home/copy";
import { publicSchools } from "@/features/home/schools";
import { routing } from "@/i18n/routing";
import { learnersOpen } from "@/features/learners/general";

async function copyFor(locale: "en" | "ar"): Promise<HomeCopy> {
  const t = await getTranslations({ locale, namespace: "Home" });
  // `continueAs` keeps its {who} placeholder: the browser fills it in.
  return Object.fromEntries(
    HOME_KEYS.map((k) => [k, k === "continueAs" ? t.raw(k) : t(k)]),
  ) as HomeCopy;
}

/** Public front door: a welcome with sound, then general learner or school user. */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const other = locale === "ar" ? "en" : "ar";

  return (
    <HomeExperience
      texts={{
        main: { lang: locale, copy: await copyFor(locale) },
        other: { lang: other, copy: await copyFor(other) },
      }}
      schools={await publicSchools()}
      generalOpen={learnersOpen()}
      sidebar={<PublicSidebar />}
      controls={
        <>
          <AppNav />
          <LocaleSwitcher />
          <ThemeToggle />
        </>
      }
    />
  );
}
