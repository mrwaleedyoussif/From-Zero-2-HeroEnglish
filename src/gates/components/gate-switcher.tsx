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
    <nav aria-label={tg("switcherLabel")} className="flex max-w-full gap-1 overflow-x-auto">
      {gates.map((g) => (
        <Link
          key={g.key}
          href={g.basePath}
          aria-current={g.key === current ? "page" : undefined}
          className="rounded-full border border-white/30 px-3 py-1 text-xs whitespace-nowrap hover:bg-white/10 aria-[current=page]:border-[#f6dc9c] aria-[current=page]:bg-[#f6dc9c] aria-[current=page]:font-semibold aria-[current=page]:text-[#0e223d]"
        >
          {t(`gate.${g.key}`)}
        </Link>
      ))}
    </nav>
  );
}
