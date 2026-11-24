import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { CLIENT_NAMESPACES } from "@/i18n/client-namespaces";
import { directionOf, routing } from "@/i18n/routing";
import "../globals.css";

// Only the student font is preloaded (student pages are the performance target, SPEC); the
// staff and Arabic fonts still load as soon as a page uses them.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", preload: false });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  // Two weights only (medium/semibold map to them): fewer, smaller downloads for Arabic pages.
  weight: ["400", "700"],
  variable: "--font-plex-arabic",
});
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("title"),
    description: t("description"),
    applicationName: "Zero-2-Hero English",
    // Lets iPhones and iPads open the installed app full-screen, without the browser's bars.
    appleWebApp: { capable: true, title: "Zero-2-Hero", statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = { themeColor: "#0e223d" };

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Per-request CSP nonce from src/proxy.ts (this also keeps every page dynamically rendered,
  // which a nonce-based CSP needs).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const all = await getMessages();
  const messages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, all[ns]]));

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${inter.variable} ${plexArabic.variable} ${atkinson.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider nonce={nonce}>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
