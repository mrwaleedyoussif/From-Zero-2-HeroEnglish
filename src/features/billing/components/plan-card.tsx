import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { localName } from "@/lib/i18n-names";
import { registry } from "@/lib/registry";
import { savePlanEntitlements } from "../actions";
import type { plansWithEntitlements } from "../queries";

type Plan = Awaited<ReturnType<typeof plansWithEntitlements>>[number];

/** Entitlements editor for one plan: everything ("*"), or chosen modules/features + limits. */
export async function PlanCard({ plan, canEdit }: { plan: Plan; canEdit: boolean }) {
  const t = await getTranslations("Plans");
  const tr = await getTranslations("Registry");
  const locale = await getLocale();
  const has = new Map(plan.plan_entitlements.map((e) => [e.key, e.limit_value]));
  const grantable = registry.filter((e) => e.kind === "module" || e.kind === "feature");
  const limits = registry.filter((e) => e.kind === "limit");

  const box = (key: string, label: string) => (
    <label key={key} className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="ent"
        value={key}
        defaultChecked={has.has(key)}
        disabled={!canEdit}
        className="size-4"
      />
      {label}
    </label>
  );

  return (
    <Card data-plan={plan.key}>
      <CardHeader>
        <CardTitle>{localName(plan, locale)}</CardTitle>
      </CardHeader>
      <CardContent>
        <ActionForm
          action={savePlanEntitlements}
          resetOnSuccess={false}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="plan_id" value={plan.id} />
          {box("*", t("everything"))}
          <fieldset className="grid gap-1 sm:grid-cols-2">
            <legend className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
              {t("modules")}
            </legend>
            {grantable.map((e) => box(e.key, tr(e.key)))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
              {t("limits")}
            </legend>
            {limits.map((e) => (
              <div key={e.key} className="flex flex-wrap items-center gap-2">
                {box(e.key, tr(e.key))}
                <Input
                  name={`limit:${e.key}`}
                  type="number"
                  min={0}
                  aria-label={`${tr(e.key)} — ${t("limitValue")}`}
                  placeholder={t("unlimited")}
                  defaultValue={has.get(e.key) ?? ""}
                  disabled={!canEdit}
                  className="w-32"
                />
              </div>
            ))}
          </fieldset>
          {canEdit && (
            <Button type="submit" className="self-start">
              {t("save")}
            </Button>
          )}
        </ActionForm>
      </CardContent>
    </Card>
  );
}
