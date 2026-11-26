import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Hue } from "@/features/departments/catalog";
import "./units.css";

/** One part of a unit: a coloured panel with an icon and a heading. */
export function UnitPanel({
  hue,
  icon: Icon,
  title,
  children,
  part,
}: {
  hue: Hue;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  part: string;
}) {
  return (
    <section
      data-hue={hue}
      data-part={part}
      className="unit-panel flex flex-col gap-4 rounded-2xl p-5"
    >
      <h2 className="flex items-center gap-2.5 text-lg font-bold">
        <span aria-hidden className="icon-tile size-9 rounded-xl">
          <Icon className="size-5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** An English line with its Arabic support beneath. */
export function Bi({ en, ar }: { en?: string; ar?: string }) {
  return (
    <span className="flex flex-col">
      {en && <span>{en}</span>}
      {ar && (
        <span lang="ar" dir="rtl" className="text-sm text-muted-foreground">
          {ar}
        </span>
      )}
    </span>
  );
}
