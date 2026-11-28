"use client";

import { Maximize, Minimize } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const subscribe = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

/** Fills the screen with the app, and brings the browser back. Hidden where the device cannot. */
export function FullScreenButton() {
  const t = useTranslations("Shell");
  const can = useSyncExternalStore(
    () => () => {},
    () => document.fullscreenEnabled,
    () => false,
  );
  const full = useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement !== null,
    () => false,
  );
  if (!can) return null;
  const label = full ? t("navFullOff") : t("navFullOn");

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={full}
      data-full-screen
      onClick={() =>
        void (
          full ? document.exitFullscreen() : document.documentElement.requestFullscreen()
        ).catch(
          () => {}, // the browser said no: nothing to do
        )
      }
    >
      {full ? (
        <Minimize aria-hidden className="text-amber-300" />
      ) : (
        <Maximize aria-hidden className="text-amber-300" />
      )}
    </Button>
  );
}
