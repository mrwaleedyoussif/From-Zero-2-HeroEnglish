import { useTranslations } from "next-intl";
import { type Grade, type Mode, PASS, starsOf } from "../strokes/grade";

const BARS = [
  ["coverage", "#22B573"],
  ["match", "#2F9BF0"],
  ["direction", "#9B6CF6"],
] as const;

/** The mark after Check: the score, three measures, what the colours mean and what to fix. */
export function Result({ grade: g, mode, isBest }: { grade: Grade; mode: Mode; isBest: boolean }) {
  const t = useTranslations("Handwriting");
  const stars = starsOf(g.score);
  if (g.empty)
    return (
      <p
        data-mark="0"
        className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 font-bold dark:bg-amber-950/30"
      >
        {t("tip.empty")}
      </p>
    );
  return (
    <div
      data-mark={g.score}
      className={`flex flex-col gap-3 rounded-2xl border-2 p-4 ${g.score >= PASS ? "border-success bg-success/10" : "border-amber-400 bg-amber-50 dark:bg-amber-950/30"}`}
    >
      <p className="text-lg font-bold">
        {t(mode === "trace" ? "scoreTrace" : "scoreWrite", { n: g.score })}{" "}
        <span aria-label={t("stars", { n: stars })}>
          <span aria-hidden>{"★".repeat(stars) + "☆".repeat(3 - stars)}</span>
        </span>
        {isBest && <strong className="ms-2 text-success">{t("newBest")}</strong>}
      </p>
      <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 text-sm">
        {BARS.map(([k, col]) => {
          const v = Math.round(g[k] * 100);
          return (
            <div key={k} data-criterion={k} className="contents">
              <dt>{t(k === "match" ? `crit.match.${mode}` : `crit.${k}`)}</dt>
              <dd aria-hidden className="h-2.5 overflow-hidden rounded-full bg-background">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${v}%`, background: col }}
                />
              </dd>
              <dd className="font-bold tabular-nums">{v}%</dd>
            </div>
          );
        })}
      </dl>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {(
          [
            ["written", "#22B573"],
            ["missed", "#E0445C"],
            ...(mode === "trace" ? ([["off", "#F2994A"]] as const) : []),
          ] as const
        ).map(([k, col]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span aria-hidden className="size-3.5 rounded-full" style={{ background: col }} />
            {t(`key.${k}`)}
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-1">
        {g.codes.map((c) => (
          <li key={c} data-tip={c}>
            {c === "good" ? "✓" : "→"} {t(`tip.${c}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
