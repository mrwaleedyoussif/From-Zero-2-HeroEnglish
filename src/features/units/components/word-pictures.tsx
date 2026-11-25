"use client";

import { ImagePlus, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { linkUnitAudio } from "../import";
import { drawWordPictures, wordsWithoutPictures } from "../picture-actions";

/**
 * Owner: have the AI reader draw a picture for every word that has none. It works through the
 * units a few words at a time, can be stopped, and carries on from where it stopped next time.
 */
export function WordPictures() {
  const t = useTranslations("Units");
  const te = useTranslations("Errors");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ done: number; total: number; drawn: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const stop = useRef(false);

  const run = async () => {
    setBusy(true);
    setNote(null);
    stop.current = false;
    try {
      await linkUnitAudio();
      const list = await wordsWithoutPictures();
      if (!list.ok || !list.data) return setNote(te(list.ok ? "failed" : list.error));
      const total = list.data.words;
      let done = 0;
      let drawn = 0;
      setState({ done, total, drawn });
      for (const unit of list.data.units) {
        for (let left = unit.missing; left > 0 && !stop.current;) {
          const r = await drawWordPictures(unit.id);
          if (!r.ok || !r.data) return setNote(te(r.ok ? "failed" : r.error));
          const handled = r.data.drawn + r.data.skipped;
          if (handled === 0) break;
          left -= handled;
          done += handled;
          drawn += r.data.drawn;
          setState({ done, total, drawn });
        }
        if (stop.current) break;
      }
      await linkUnitAudio();
      setNote(t("picturesDone", { drawn, left: Math.max(0, total - done) }));
    } catch {
      setNote(te("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4" data-word-pictures>
      <p className="text-sm text-muted-foreground">{t("picturesHelp")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={run} disabled={busy}>
          <ImagePlus aria-hidden className="size-4" />
          {t("picturesButton")}
        </Button>
        {busy && (
          <Button variant="ghost" onClick={() => (stop.current = true)}>
            <Square aria-hidden className="size-4" />
            {t("stop")}
          </Button>
        )}
      </div>
      <div aria-live="polite" className="text-sm">
        {busy && state && (
          <>
            <progress value={state.done} max={Math.max(1, state.total)} className="w-full" />
            <p>{t("picturesProgress", state)}</p>
          </>
        )}
        {note && <p className="font-medium">{note}</p>}
      </div>
    </div>
  );
}
