import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, SelectField, TextField } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveSubscription } from "@/features/billing/actions";
import { PlanCard } from "@/features/billing/components/plan-card";
import { plansWithEntitlements, schoolSubscriptions } from "@/features/billing/queries";
import { can } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";
import { platformTarget } from "@/lib/auth/scope";
import { serverEnv } from "@/lib/env";
import { localName } from "@/lib/i18n-names";

/** Plans & entitlements (SPEC §13). Billing stays off until the business starts charging. */
export default async function PlansPage({ params }: PageProps<"/[locale]/owner/plans">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "billing:manage", "page.owner.plans");
  const t = await getTranslations("Plans");
  const [plans, schools] = await Promise.all([plansWithEntitlements(), schoolSubscriptions()]);
  const canEdit = !actor.viewAs && (await can(actor, "billing:manage", platformTarget));
  const freePlan = plans.find((p) => p.key === "free");

  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      {!serverEnv().BILLING_ENABLED && (
        <Alert>
          <AlertDescription>{t("billingOff")}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("schools")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {schools.map((s) => (
            <ActionForm key={s.id} action={saveSubscription} resetOnSuccess={false}>
              <input type="hidden" name="school_id" value={s.id} />
              <FormRow>
                <span className="w-48 pb-2 font-medium">
                  {s.code} · {localName(s, locale)}
                </span>
                <SelectField
                  idPrefix={`sub-${s.code}`}
                  label={t("plan")}
                  name="plan_id"
                  defaultValue={s.subscription?.plan_id ?? freePlan?.id}
                  disabled={!canEdit}
                  options={plans.map((p) => ({ value: p.id, label: localName(p, locale) }))}
                />
                <TextField
                  idPrefix={`sub-${s.code}`}
                  label={t("freeUntil")}
                  name="free_until"
                  type="date"
                  defaultValue={s.subscription?.free_until ?? ""}
                  disabled={!canEdit}
                />
                {canEdit && <Button type="submit">{t("save")}</Button>}
              </FormRow>
            </ActionForm>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} canEdit={canEdit} />
        ))}
      </div>
    </>
  );
}
