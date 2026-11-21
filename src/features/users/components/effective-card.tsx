import { getLocale, getTranslations } from "next-intl/server";
import { FormRow, type Option, SelectField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadAuthority } from "@/lib/auth/authority";
import { type Decision, explain, type Target } from "@/lib/auth/engine";
import type { listPermissions } from "../queries";

/**
 * Effective-permission preview (SPEC §3): every permission, evaluated with the same engine
 * the app uses, against a chosen place — with the reason ("why").
 */
export async function EffectiveCard({
  userId,
  permissions,
  target,
  targetValue,
  targetOptions,
  labels,
}: {
  userId: string;
  permissions: Awaited<ReturnType<typeof listPermissions>>;
  target: Target;
  targetValue: string;
  targetOptions: Option[];
  labels: Map<string, string>;
}) {
  const t = await getTranslations("UserDetail");
  const ts = await getTranslations("Scopes");
  const locale = await getLocale();
  const authority = await loadAuthority(userId);

  const why = (d: Decision): string => {
    if (!d.via) return t(`why.${d.reason}`);
    const scope = d.via.scope;
    const where = `${ts(scope.type)}${scope.id ? ` · ${labels.get(scope.id) ?? ""}` : ""}`;
    return "roleKey" in d.via
      ? t("why.roleVia", { role: d.via.roleKey, where })
      : t(`why.${d.reason}`) + ` (${where})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("effective")}</CardTitle>
        <CardDescription>{t("effectiveHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form method="get" className="contents">
          <FormRow>
            <SelectField
              idPrefix="eff"
              label={t("checkAt")}
              name="at"
              defaultValue={targetValue}
              options={targetOptions}
            />
            <Button type="submit" variant="secondary">
              {t("check")}
            </Button>
          </FormRow>
        </form>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("permission")}</TableHead>
              <TableHead>{t("result")}</TableHead>
              <TableHead>{t("why.title")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((p) => {
              const d = explain(authority, p.key, target);
              return (
                <TableRow key={p.key}>
                  <TableCell>
                    <code dir="ltr" className="text-xs">
                      {p.key}
                    </code>
                    <div className="text-xs text-muted-foreground">
                      {locale === "ar" ? p.description_ar : p.description_en}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={d.allowed ? "font-semibold text-success" : "text-muted-foreground"}
                    >
                      {d.allowed ? `✓ ${t("allowed")}` : `✗ ${t("denied")}`}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{why(d)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
