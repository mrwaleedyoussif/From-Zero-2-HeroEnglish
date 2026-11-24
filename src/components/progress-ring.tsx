import "./progress-ring.css";

/** Strong colours on light pages, their light counterparts on dark pages and dark panels. */
const TONES = {
  violet: ["#6d28d9", "#c4b5fd"],
  green: ["#047857", "#6ee7b7"],
  amber: ["#b45309", "#fcd34d"],
  blue: ["#1d4ed8", "#93c5fd"],
  rose: ["#be123c", "#fda4af"],
  gold: ["#a16207", "#f6dc9c"],
} as const;
export type RingTone = keyof typeof TONES;

/** Green from 80, amber from 50, rose below: the number inside always says it too. */
export const toneFor = (value: number | null): RingTone =>
  value === null ? "blue" : value >= 80 ? "green" : value >= 50 ? "amber" : "rose";

const R = 42;
const AROUND = 2 * Math.PI * R;

/**
 * A circle that fills with progress (0–100), the value written in the middle and its label
 * beneath. Read by screen readers as "label: value". `onDark` is for coloured or navy panels.
 */
export function ProgressRing({
  value,
  label,
  tone,
  display,
  size = 96,
  onDark = false,
}: {
  value: number | null;
  label: string;
  tone?: RingTone;
  /** Text in the middle when it is not a percentage (e.g. "18 MB", "3/5"). */
  display?: string;
  size?: number;
  onDark?: boolean;
}) {
  const pct = value === null ? 0 : Math.min(100, Math.max(0, Math.round(value)));
  const text = display ?? (value === null ? "—" : `${pct}%`);
  const [strong, light] = TONES[tone ?? toneFor(value)];
  const small = size < 64;
  return (
    <div
      role="img"
      aria-label={`${label}: ${text}`}
      data-ring={pct}
      className={`ring-wrap flex flex-col items-center gap-1 text-center ${onDark ? "ring-on-dark" : ""}`}
      style={{ "--ring": strong, "--ring-light": light } as React.CSSProperties}
    >
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="11" className="ring-track" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            strokeDasharray={AROUND}
            className="ring-arc"
            style={{ "--gap": AROUND * (1 - pct / 100), "--full": AROUND } as React.CSSProperties}
          />
        </svg>
        <span
          aria-hidden
          className={`absolute inset-0 flex items-center justify-center font-extrabold tabular-nums ${small ? "text-[0.7rem]" : "text-lg"}`}
        >
          {small ? text.replace("%", "") : text}
        </span>
      </span>
      {!small && (
        <span aria-hidden className="ring-label max-w-28 text-xs leading-tight font-medium">
          {label}
        </span>
      )}
    </div>
  );
}
