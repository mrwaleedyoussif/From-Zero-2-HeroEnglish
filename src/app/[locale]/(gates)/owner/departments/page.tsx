import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { AUDIENCES, CATALOG } from "@/features/departments/catalog";
import { DepartmentSwitch } from "@/features/departments/components/department-switches";
import { departmentIcon } from "@/features/departments/icons";
import { departmentStates } from "@/features/departments/states";
import { requirePermission } from "@/lib/auth/guard";
import "@/features/departments/components/department-grid.css";

/** Owner: open, close or hide every department, separately for each kind of learner. */
export default async function OwnerDepartmentsPage({
  params,
}: PageProps<"/[locale]/owner/departments">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "visibility:manage", "page.owner.departments");
  const t = await getTranslations("OwnerDepartments");
  const td = await getTranslations("Departments");
  const chosen = await departmentStates();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("intro")} />
      <p className="text-sm text-muted-foreground">{t("stateHelp")}</p>
      <div className="grid gap-6 xl:grid-cols-2">
        {AUDIENCES.map((audience) => (
          <section
            key={audience}
            data-audience={audience}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <h2 className="text-lg font-bold">{td(`audience.${audience}`)}</h2>
            <ul className="flex flex-col divide-y divide-border">
              {CATALOG[audience].map((d) => {
                const Icon = departmentIcon(d.key);
                const state = chosen.get(audience)?.get(d.key) ?? (d.soon ? "soon" : "open");
                return (
                  <li
                    key={d.key}
                    data-hue={d.hue}
                    className="flex flex-wrap items-center gap-3 py-2.5"
                  >
                    <span aria-hidden className="icon-tile size-9 rounded-lg">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{td(`names.${d.key}`)}</span>
                    <DepartmentSwitch
                      audience={audience}
                      department={d.key}
                      name={td(`names.${d.key}`)}
                      audienceName={td(`audience.${audience}`)}
                      initial={state}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
