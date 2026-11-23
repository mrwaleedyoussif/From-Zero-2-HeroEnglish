"use client";

import Image from "next/image";
import { ArrowLeft, CloudDownload, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

/** Drop anything the browser saved for the site, then load the newest version from the server. */
async function updateApp() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = (await globalThis.caches?.keys()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    // nothing saved, or the browser blocks it: reloading is still right
  }
  window.location.reload();
}

/**
 * The app's own buttons, on every page: home (the logo), back, refresh (fresh data for this
 * page) and update (newest version of the app). Useful where the browser's are hidden, as on
 * a phone's home-screen app.
 */
export function AppNav({ home = "/" }: { home?: "/" | "/home" }) {
  const t = useTranslations("Shell");
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  return (
    <nav aria-label={t("nav")} className="flex items-center gap-1 print:hidden">
      <Link
        href={home}
        aria-label={t("navHome")}
        title={t("navHome")}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Image src="/brand/badge.png" alt="" width={40} height={40} className="size-10" />
      </Link>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("navBack")}
        title={t("navBack")}
        onClick={() => router.back()}
      >
        <ArrowLeft aria-hidden className="rtl:rotate-180" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("navRefresh")}
        title={t("navRefresh")}
        onClick={() => startRefresh(() => router.refresh())}
      >
        <RefreshCw aria-hidden className={refreshing ? "animate-spin" : undefined} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("navUpdate")}
        title={t("navUpdate")}
        onClick={() => void updateApp()}
      >
        <CloudDownload aria-hidden />
      </Button>
    </nav>
  );
}
