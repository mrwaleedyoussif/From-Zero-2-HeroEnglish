"use client";

/**
 * Put sentences in order by clicking them: the first click gives a sentence number 1, the next
 * number 2, and so on. Clicking a numbered sentence takes its number away again.
 * The value is the letters in the chosen order, e.g. "c, a, b".
 */
export function OrderPicker({
  events,
  value,
  onChange,
  disabled,
  label,
}: {
  events: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
}) {
  const order = value ? value.split(", ") : [];
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      {events.map((event, i) => {
        const letter = String.fromCharCode(97 + i);
        const at = order.indexOf(letter);
        return (
          <button
            key={event}
            type="button"
            disabled={disabled}
            aria-pressed={at >= 0}
            data-order={at >= 0 ? at + 1 : undefined}
            onClick={() =>
              onChange(
                (at >= 0 ? order.filter((l) => l !== letter) : [...order, letter]).join(", "),
              )
            }
            className="unit-option flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-start text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
          >
            <span
              className="unit-chip inline-flex size-7 shrink-0 items-center justify-center rounded-full font-bold"
              data-filled={at >= 0}
            >
              {at >= 0 ? at + 1 : ""}
            </span>
            <span>{event}</span>
          </button>
        );
      })}
    </div>
  );
}
