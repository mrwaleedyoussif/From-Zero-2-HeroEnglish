import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GateConfig } from "../types";

/** Shown when the user can enter more than one gate. */
export async function GateSwitcher({
  current,
  gates,
}: {
  current: string;
  gates: readonly GateConfig[];
}) {
  if (gates.length < 2) return null;
  const t = await getTranslations("Registry");
  const tg = await getTranslations("Gates");
  return (
    <nav aria-label={tg("switcherLabel")} className="flex flex-wrap gap-1">
      {gates.map((g) => (
        <Link
          key={g.key}
          href={g.basePath}
          aria-current={g.key === current ? "page" : undefined}
          className="rounded-full border border-border px-3 py-1 text-xs aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
        >
          {t(`gate.${g.key}`)}
        </Link>
      ))}
    </nav>
  );
}
