import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, localName } from "@/lib/i18n-names";
import type { SessionResult } from "../results";

const CEFR_CLASS: Record<string, string> = {
  PreA1: "bg-cefr-pre-a1 text-cefr-light-fg",
  A1: "bg-cefr-a1 text-cefr-light-fg",
  A2: "bg-cefr-a2 text-cefr-light-fg",
  B1: "bg-cefr-b1 text-cefr-light-fg",
  B2: "bg-cefr-b2 text-cefr-dark-fg",
  C1: "bg-cefr-c1 text-cefr-dark-fg",
  C2: "bg-cefr-c2 text-cefr-dark-fg",
};

/** θ in logits → bar width (−3 … +3 → 0 … 100%). */
const pct = (theta: number) => Math.round(Math.min(100, Math.max(4, ((theta + 3) / 6) * 100)));

/** Student-friendly result (SPEC §7 output): level, score, skills, strengths, where to start. */
export async function ResultCard({ result }: { result: SessionResult }) {
  const t = await getTranslations("Placement");
  const locale = await getLocale();
  const s = result.session;
  const pendingScoring = result.submissions.some((x) => x.status !== "scored");

  return (
    <Card data-result={s.cefr ?? ""}>
      <CardHeader>
        <CardDescription>
          {s.departments ? localName(s.departments, locale) : ""} ·{" "}
          {s.completed_at ? formatDate(s.completed_at, locale) : ""}
        </CardDescription>
        <CardTitle className="flex flex-wrap items-center gap-4 text-2xl">
          {t("yourLevel")}
          <span
            className={`rounded-lg px-4 py-1 text-3xl font-bold ${CEFR_CLASS[s.cefr ?? ""] ?? "bg-muted"}`}
          >
            {s.cefr ?? "—"}
          </span>
          <span className="text-base font-normal text-muted-foreground">
            {t("scaled", { score: s.scaled_score ?? 0 })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ul className="flex flex-col gap-3">
          {result.estimates.map((e) => (
            <li key={e.skill} className="flex flex-col gap-1">
              <span className="flex justify-between text-sm">
                <span>{e.info ? localName(e.info, locale) : e.skill}</span>
              </span>
              <span className="h-3 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${pct(e.theta)}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
        {result.strengths.length > 0 && (
          <p>
            <Badge className="me-2">{t("strengths")}</Badge>
            {result.strengths.map((k) => localName(k, locale)).join(" · ")}
          </p>
        )}
        {result.gaps.length > 0 && (
          <p>
            <Badge variant="outline" className="me-2">
              {t("practiseMore")}
            </Badge>
            {result.gaps.map((k) => localName(k, locale)).join(" · ")}
          </p>
        )}
        {pendingScoring && <p className="text-sm text-muted-foreground">{t("awaitingTeacher")}</p>}
        {result.recommended.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">{t("startWith")}</h3>
            <ul className="flex flex-col gap-1">
              {result.recommended.map((l) => {
                const href = l.media_asset_id ? `/api/media/${l.media_asset_id}` : l.content_url;
                const title = locale === "ar" ? l.title_ar : l.title_en;
                return (
                  <li key={l.id}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {title}
                      </a>
                    ) : (
                      title
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
