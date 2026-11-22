import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { TextField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/i18n-names";
import { awardTeam, decideRedemption, giveKudos, setLeaderboard } from "../actions";

/** On/off switch for the class (and team) leaderboard. */
export async function LeaderboardSwitch({ classId, on }: { classId: string; on: boolean }) {
  const t = await getTranslations("TeacherRewards");
  return (
    <ActionForm
      action={setLeaderboard}
      className="flex flex-wrap items-center gap-3"
      resetOnSuccess={false}
    >
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="enabled" value={on ? "off" : "on"} />
      <span data-leaderboard={on ? "on" : "off"}>{on ? t("boardIsOn") : t("boardIsOff")}</span>
      <Button type="submit" variant="outline" size="sm">
        {on ? t("turnOff") : t("turnOn")}
      </Button>
    </ActionForm>
  );
}

export async function KudosList({ students }: { students: { id: string; name: string }[] }) {
  const t = await getTranslations("TeacherRewards");
  return (
    <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
      {students.map((s) => (
        <li
          key={s.id}
          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          data-kudos={s.name}
        >
          <span>{s.name}</span>
          <ActionForm action={giveKudos} successMessage="kudosSent">
            <input type="hidden" name="student_id" value={s.id} />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              aria-label={t("kudosFor", { name: s.name })}
            >
              👏 {t("kudos")}
            </Button>
          </ActionForm>
        </li>
      ))}
    </ul>
  );
}

export async function TeamPointsForm({
  classId,
  teams,
}: {
  classId: string;
  teams: { id: string; name: string }[];
}) {
  const t = await getTranslations("TeacherRewards");
  return (
    <div className="flex flex-col gap-2">
      {teams.map((team) => (
        <ActionForm
          key={team.id}
          action={awardTeam}
          successMessage="saved"
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="team_id" value={team.id} />
          <span className="min-w-24 pb-2 font-medium">{team.name}</span>
          <TextField
            idPrefix={`tp-${team.id.slice(0, 8)}`}
            label={t("points")}
            name="points"
            type="number"
            min={1}
            max={100}
            defaultValue={5}
            required
            className="w-24"
          />
          <TextField
            idPrefix={`tp-${team.id.slice(0, 8)}`}
            label={t("reason")}
            name="reason"
            maxLength={120}
            placeholder={t("reasonExample")}
          />
          <Button type="submit" size="sm">
            {t("give")}
          </Button>
        </ActionForm>
      ))}
    </div>
  );
}

type Request = {
  id: string;
  cost: number;
  created_at: string;
  student: string;
  item: string;
};

export async function RedemptionQueue({ requests }: { requests: Request[] }) {
  const t = await getTranslations("TeacherRewards");
  const locale = await getLocale();
  if (requests.length === 0)
    return <p className="text-sm text-muted-foreground">{t("noRequests")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {requests.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
          data-request={r.student}
        >
          <span>
            {r.student} — {r.item} ({t("cost", { n: r.cost })}) · {formatDate(r.created_at, locale)}
          </span>
          <span className="flex gap-2">
            {(["yes", "no"] as const).map((v) => (
              <ActionForm key={v} action={decideRedemption} successMessage="saved">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="approve" value={v} />
                <Button type="submit" size="sm" variant={v === "yes" ? "default" : "outline"}>
                  {v === "yes" ? t("approve") : t("reject")}
                </Button>
              </ActionForm>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
