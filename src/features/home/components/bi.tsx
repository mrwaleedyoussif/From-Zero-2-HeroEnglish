import type { HomeKey, HomeTexts } from "../copy";

/** A label in the reader's language, with the other language smaller beneath it. */
export function Bi({
  texts,
  k,
  className,
  otherClassName = "text-sm font-normal text-[var(--z-soft)]",
}: {
  texts: HomeTexts;
  k: HomeKey;
  className?: string;
  otherClassName?: string;
}) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className={className}>{texts.main.copy[k]}</span>
      <span
        lang={texts.other.lang}
        dir={texts.other.lang === "ar" ? "rtl" : "ltr"}
        // Lines up with the main label, whatever its own writing direction.
        className={`${otherClassName} ${texts.main.lang === "ar" ? "text-right" : "text-left"}`}
      >
        {texts.other.copy[k]}
      </span>
    </span>
  );
}
