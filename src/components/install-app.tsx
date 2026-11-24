"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

/** Chrome, Edge and Android offer installing through this event; Safari has no such event. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}
let offer: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep it for our own button
    offer = e as InstallEvent;
    listeners.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    offer = null;
    listeners.forEach((f) => f());
  });
}
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => void listeners.delete(f);
};
const never = () => () => {};

/** Which written steps fit this device, when the browser cannot install with one tap. */
function device(): "ios" | "mac" | "other" | "installed" {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ua = navigator.userAgent;
  // iPads say they are Macs; a Mac has no touch screen.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1))
    return "ios";
  return /Macintosh/.test(ua) ? "mac" : "other";
}

/**
 * "Install the app": one tap where the browser allows it (Android, Windows, Chrome and Edge on
 * a Mac), and the right written steps elsewhere (iPhone, iPad, Safari on a Mac). Hidden once
 * the app is installed and open as an app.
 */
export function InstallApp() {
  const t = useTranslations("Shell");
  const ready = useSyncExternalStore(
    subscribe,
    () => offer !== null,
    () => false,
  );
  const kind = useSyncExternalStore(never, device, () => "other" as const);
  const [help, setHelp] = useState(false);
  if (kind === "installed") return null;

  return (
    <div className="flex flex-col gap-2" data-install={ready ? "prompt" : kind}>
      <button
        type="button"
        aria-expanded={ready ? undefined : help}
        onClick={() => (offer ? void offer.prompt() : setHelp(!help))}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(110deg,#34d399,#0ea5e9)] px-3 text-sm font-bold text-[#06231c] outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-white"
      >
        <Download aria-hidden className="size-4" />
        {t("install")}
      </button>
      {help && !ready && (
        <p role="status" className="rounded-xl bg-white/10 p-2.5 text-sm text-white">
          {t(
            kind === "ios"
              ? "installHelpIos"
              : kind === "mac"
                ? "installHelpMac"
                : "installHelpOther",
          )}
        </p>
      )}
    </div>
  );
}
