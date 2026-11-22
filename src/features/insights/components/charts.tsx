import { CEFR_LEVELS } from "../analytics";

/** Colour-blind-safe CEFR scale (SPEC §16 tokens); every segment also carries its label. */
export const CEFR_BG: Record<string, string> = {
  PreA1: "bg-cefr-pre-a1 text-cefr-light-fg",
  A1: "bg-cefr-a1 text-cefr-light-fg",
  A2: "bg-cefr-a2 text-cefr-light-fg",
  B1: "bg-cefr-b1 text-cefr-light-fg",
  B2: "bg-cefr-b2 text-cefr-dark-fg",
  C1: "bg-cefr-c1 text-cefr-dark-fg",
  C2: "bg-cefr-c2 text-cefr-dark-fg",
  none: "bg-muted text-muted-foreground",
};

const TONE = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  warning: "bg-warning",
  danger: "bg-destructive",
} as const;

/** Horizontal bars (flex, so they follow the page direction in Arabic). */
export function BarChart({
  rows,
  max,
  tone = "primary",
}: {
  rows: { label: string; value: number | null; display?: string }[];
  max?: number;
  tone?: keyof typeof TONE;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[minmax(4rem,8rem)_1fr_auto] items-center gap-2 text-sm"
        >
          <span className="truncate">{r.label}</span>
          <span className="h-4 overflow-hidden rounded bg-muted">
            <span
              className={`block h-full rounded ${TONE[tone]}`}
              style={{ width: `${Math.max(0, Math.min(100, ((r.value ?? 0) / top) * 100))}%` }}
            />
          </span>
          <span className="text-muted-foreground tabular-nums">{r.display ?? r.value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

/** One stacked bar per row showing how many learners sit at each CEFR level. */
export function CefrStack({
  rows,
  noneLabel,
}: {
  rows: { label: string; counts: { cefr: string; n: number }[] }[];
  noneLabel: string;
}) {
  const order = [...CEFR_LEVELS, "none"];
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const total = r.counts.reduce((s, c) => s + c.n, 0) || 1;
        const parts = [...r.counts].sort((a, b) => order.indexOf(a.cefr) - order.indexOf(b.cefr));
        return (
          <div
            key={r.label}
            className="grid grid-cols-[minmax(4rem,8rem)_1fr] items-center gap-2 text-sm"
          >
            <span className="truncate">{r.label}</span>
            <span className="flex h-6 overflow-hidden rounded">
              {parts.map((p) => (
                <span
                  key={p.cefr}
                  className={`flex items-center justify-center text-xs font-medium ${CEFR_BG[p.cefr] ?? "bg-muted"}`}
                  style={{ width: `${(p.n / total) * 100}%` }}
                  title={`${p.cefr === "none" ? noneLabel : p.cefr}: ${p.n}`}
                >
                  {(p.n / total) * 100 >= 12 ? (p.cefr === "none" ? "—" : p.cefr) : ""}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
