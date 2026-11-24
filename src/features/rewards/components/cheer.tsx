"use client";

import { Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { type Cheer as Kind, playCheer } from "../sounds";
import "./cheer.css";

const PIECES = ["⭐", "✨", "🎉", "⭐", "💫", "✨", "🌟", "🎊", "⭐", "✨", "💫", "🌟"];

/**
 * The moment after a practice check: stars and a bright sound for a strong score, a calm
 * encouraging line and a soft sound otherwise. Never a buzzer, never the score alone. The sound
 * can be replayed, and the words say the same thing for anyone who can't hear it.
 */
export function Cheer({ score }: { score: number }) {
  const t = useTranslations("Rewards");
  const kind: Kind = score >= 80 ? "great" : score >= 50 ? "good" : "tryAgain";
  const lines = Object.values(t.raw(`cheer.${kind}`) as Record<string, string>);
  const line = lines[score % lines.length] ?? "";

  useEffect(() => {
    playCheer(kind);
  }, [kind]);

  return (
    <div className="cheer relative flex flex-col items-center gap-2" data-cheer={kind}>
      {kind === "great" && (
        <div aria-hidden className="cheer-burst">
          {PIECES.map((p, i) => (
            <span key={i} style={{ "--n": i } as React.CSSProperties}>
              {p}
            </span>
          ))}
        </div>
      )}
      <p role="status" className="cheer-line text-2xl font-extrabold">
        {line}
      </p>
      <button
        type="button"
        onClick={() => playCheer(kind)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground"
      >
        <Volume2 aria-hidden className="size-4" />
        {t("cheer.replay")}
      </button>
    </div>
  );
}
