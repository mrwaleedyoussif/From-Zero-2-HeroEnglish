"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Unexpected error inside a page: friendly message, retry, and the digest for support. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ErrorPages");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main
      className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 p-6 text-center"
      role="alert"
    >
      <p className="text-6xl" aria-hidden>
        🛠️
      </p>
      <h1 className="text-2xl font-semibold">{t("errorTitle")}</h1>
      <p className="text-muted-foreground">{t("errorBody")}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>{t("retry")}</Button>
        <Button asChild variant="outline">
          <Link href="/home">{t("home")}</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground">{t("reference", { id: error.digest })}</p>
      )}
    </main>
  );
}
