import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { FormRow, TextField } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  approveLearner,
  cancelInvite,
  createInvite,
  rejectLearner,
  startTrial,
} from "@/features/learners/owner-actions";
import { LearnerTeachers } from "@/features/learners/components/learner-teachers";
import { inviteState } from "@/features/learners/invite-state";
import { requirePermission } from "@/lib/auth/guard";
import { formatDate } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";

/** Owner: who is waiting to join as a general learner, and the invitation codes. */
export default async function OwnerLearnersPage({ params }: PageProps<"/[locale]/owner/learners">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "users:invite", "page.owner.learners");
  const t = await getTranslations("OwnerLearners");
  const db = await createClient();
  const [{ data: waiting }, { data: invites }] = await Promise.all([
    db
      .from("learner_requests")
      .select(
        "user_id, created_at, trial_ends_at, profiles!learner_requests_user_id_fkey(full_name, email)",
      )
      .eq("status", "pending")
      .order("created_at")
      .limit(200),
    db.from("learner_invites").select("*").order("created_at", { ascending: false }).limit(200),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("intro")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("pending")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!waiting?.length && <p className="text-sm text-muted-foreground">{t("noPending")}</p>}
          {(waiting ?? []).map((w) => (
            <div
              key={w.user_id}
              data-request={w.profiles?.email}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex flex-col">
                <span className="font-medium">{w.profiles?.full_name}</span>
                <span dir="ltr" className="text-sm text-muted-foreground">
                  {w.profiles?.email} · {formatDate(w.created_at, locale)}
                </span>
                {w.trial_ends_at && (
                  <Badge
                    variant="outline"
                    className="mt-1 self-start"
                    data-trial={new Date(w.trial_ends_at) > new Date() ? "on" : "over"}
                  >
                    {new Date(w.trial_ends_at) > new Date()
                      ? t("trialUntil", { date: formatDate(w.trial_ends_at, locale) })
                      : t("trialOver")}
                  </Badge>
                )}
              </div>
              {!actor.viewAs && (
                <div className="flex flex-wrap gap-2">
                  <ActionForm action={approveLearner}>
                    <input type="hidden" name="id" value={w.user_id} />
                    <Button type="submit" size="sm">
                      {t("approve")}
                    </Button>
                  </ActionForm>
                  {!w.trial_ends_at && (
                    <ActionForm action={startTrial}>
                      <input type="hidden" name="id" value={w.user_id} />
                      <Button type="submit" size="sm" variant="secondary" data-start-trial>
                        {t("startTrial")}
                      </Button>
                    </ActionForm>
                  )}
                  <ActionForm action={rejectLearner} successMessage="removed">
                    <input type="hidden" name="id" value={w.user_id} />
                    <Button type="submit" size="sm" variant="outline">
                      {t("reject")}
                    </Button>
                  </ActionForm>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <LearnerTeachers readOnly={!!actor.viewAs} />

      <Card>
        <CardHeader>
          <CardTitle>{t("invites")}</CardTitle>
          <CardDescription>{t("invitesHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!actor.viewAs && (
            <ActionForm action={createInvite}>
              <FormRow>
                <TextField idPrefix="inv" label={t("label")} name="label" required maxLength={80} />
                <TextField
                  idPrefix="inv"
                  label={t("maxUses")}
                  name="max_uses"
                  type="number"
                  min={1}
                  defaultValue={30}
                  required
                />
                <TextField idPrefix="inv" label={t("expires")} name="expires_on" type="date" />
                <Button type="submit">{t("create")}</Button>
              </FormRow>
            </ActionForm>
          )}
          {!invites?.length && <p className="text-sm text-muted-foreground">{t("noInvites")}</p>}
          {(invites ?? []).map((i) => (
            <div
              key={i.id}
              data-invite={i.label}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex flex-col">
                <span dir="ltr" className="font-mono text-lg font-semibold tracking-widest">
                  {i.code}
                </span>
                <span className="text-sm text-muted-foreground">
                  {i.label} · {t("used")}: {i.used}/{i.max_uses} ·{" "}
                  {i.expires_at ? formatDate(i.expires_at, locale) : t("noEnd")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={inviteState(i) === "active" ? "default" : "outline"}>
                  {t(`state.${inviteState(i)}`)}
                </Badge>
                {inviteState(i) === "active" && !actor.viewAs && (
                  <ActionForm action={cancelInvite}>
                    <input type="hidden" name="id" value={i.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {t("cancel")}
                    </Button>
                  </ActionForm>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
