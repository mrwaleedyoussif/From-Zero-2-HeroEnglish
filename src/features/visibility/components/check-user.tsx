import { getTranslations } from "next-intl/server";
import { FormRow, TextField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { defaultVisibility } from "@/lib/registry";
import { decide } from "@/lib/visibility/engine";
import { findUser, rulesForUser } from "../queries";

/** "Check a user": the exact result for one person, and which rule decided it. */
export async function CheckUser({ targetKey, query }: { targetKey: string; query: string }) {
  const t = await getTranslations("Visibility");
  const user = query ? await findUser(query) : null;
  const decision = user
    ? decide(await rulesForUser(user.id), targetKey, defaultVisibility(targetKey))
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("checkUser")}</CardTitle>
        <CardDescription>{t("checkUserHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form method="get" className="contents">
          <input type="hidden" name="key" value={targetKey} />
          <FormRow>
            <TextField
              idPrefix="check"
              label={t("emailOrUsername")}
              name="user"
              dir="ltr"
              defaultValue={query}
            />
            <Button type="submit" variant="secondary">
              {t("check")}
            </Button>
          </FormRow>
        </form>
        {query && !user && <p className="text-sm text-destructive">{t("userNotFound")}</p>}
        {user && decision && (
          <p className="text-sm" role="status">
            <Link
              href={`/owner/users/${user.id}`}
              className="font-medium text-primary hover:underline"
            >
              {user.full_name}
            </Link>{" "}
            {decision.visible ? t("seesIt") : t("doesNotSee")}{" "}
            <span className="text-muted-foreground">
              (
              {decision.rule
                ? t("because", {
                    level: t(`subjects.${decision.rule.subject_type}`),
                    effect: t(`effects.${decision.rule.effect}`),
                  })
                : t("byDefault")}
              )
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
