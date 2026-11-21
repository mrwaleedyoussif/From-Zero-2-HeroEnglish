import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Tabs to switch between the teacher's classes (?class=<id>). */
export async function ClassPicker({
  classes,
  current,
  basePath,
}: {
  classes: { id: string; code: string }[];
  current: string;
  basePath: string;
}) {
  const t = await getTranslations("Assign");
  if (classes.length <= 1) return null;
  return (
    <nav aria-label={t("classes")} className="flex flex-wrap gap-2">
      {classes.map((c) => (
        <Link
          key={c.id}
          href={`${basePath}?class=${c.id}`}
          aria-current={c.id === current ? "page" : undefined}
          className="rounded-full border px-3 py-1 text-sm aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
        >
          {c.code}
        </Link>
      ))}
    </nav>
  );
}

/** The chosen class, or the first one the teacher may use. */
export function pickClass(classes: { id: string; code: string }[], wanted: unknown) {
  return classes.find((c) => c.id === wanted) ?? classes[0] ?? null;
}
