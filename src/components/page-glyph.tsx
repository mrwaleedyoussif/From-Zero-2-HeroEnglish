"use client";

import { Sparkles } from "lucide-react";
import { ICONS } from "@/gates/components/nav-icons";
import { usePathname } from "@/i18n/navigation";

/** The icon of the section the page belongs to ("/owner/users/…" → users), in the banner. */
export function PageGlyph() {
  const section = usePathname().split("/").filter(Boolean)[1] ?? "home";
  const key = section.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
  const Icon = ICONS[key] ?? Sparkles;
  return (
    <span
      aria-hidden
      className="page-hero-glyph flex size-12 shrink-0 items-center justify-center rounded-2xl"
    >
      <Icon className="size-6" />
    </span>
  );
}
