"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * Finishes a sign-in whose tokens arrive in the URL fragment (invitation emails). The fragment
 * is removed from the address bar before anything else, then exchanged for the session cookie.
 */
export function LinkSession({ fromLink }: { fromLink: boolean }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [failed, setFailed] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    let cancelled = false;
    const finish = async () => {
      if (!access_token || !refresh_token) return !fromLink;
      setWorking(true);
      const res = await fetch("/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ access_token, refresh_token }),
      }).catch(() => null);
      if (res?.ok) window.location.replace(`/${locale}/home`);
      return !!res?.ok;
    };
    void finish().then((ok) => {
      if (cancelled || ok) return;
      setWorking(false);
      setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fromLink, locale]);

  if (working) return <p role="status">{t("signingIn")}</p>;
  if (failed)
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("errors.link_invalid")}
      </p>
    );
  return null;
}
