import { getTranslations } from "next-intl/server";
import { type Audience, CATALOG } from "../catalog";
import { departmentIcon } from "../icons";
import "./department-grid.css";

/**
 * One audience's departments as colour cards: icon, name in both languages, what is inside,
 * and a "Soon" badge while the department has no content (visible, not clickable).
 */
export async function DepartmentGrid({
  audience,
  locale,
}: {
  audience: Audience;
  locale: "en" | "ar";
}) {
  const other = locale === "ar" ? "en" : "ar";
  const t = await getTranslations({ locale, namespace: "Departments" });
  const o = await getTranslations({ locale: other, namespace: "Departments" });

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-departments={audience}>
      {CATALOG[audience].map((d, i) => {
        const Icon = departmentIcon(d.key);
        return (
          <li
            key={d.key}
            data-department={d.key}
            data-hue={d.hue}
            data-soon={d.soon || undefined}
            className="dept-card flex flex-col gap-3 rounded-2xl p-4"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <span aria-hidden className="icon-tile size-12 rounded-xl [&_svg]:size-6">
                <Icon />
              </span>
              <h3 className="flex min-w-0 flex-1 flex-col text-base leading-tight font-bold">
                {t(`names.${d.key}`)}
                <span
                  lang={other}
                  dir={other === "ar" ? "rtl" : "ltr"}
                  className={`text-sm font-normal text-muted-foreground ${other === "ar" ? "text-left" : "text-right"}`}
                >
                  {o(`names.${d.key}`)}
                </span>
              </h3>
              {d.soon && (
                <span className="dept-soon shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {t("soon")}
                </span>
              )}
            </div>
            {d.inside && (
              <ul className="flex flex-wrap gap-1.5" aria-label={t("inside")}>
                {d.inside.map((p) => (
                  <li
                    key={p}
                    className="dept-part inline-flex gap-2 rounded-full px-2.5 py-1 text-xs font-medium"
                  >
                    <span>{t(`parts.${p}`)}</span>
                    <span lang={other} dir={other === "ar" ? "rtl" : "ltr"} className="opacity-80">
                      {o(`parts.${p}`)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
