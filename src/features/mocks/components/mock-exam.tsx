"use client";

import { Clock, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { playRecording } from "@/features/units/components/speak-button";
import { useRouter } from "@/i18n/navigation";
import { answerMock, leaveSection, playMockTrack } from "../actions";
import type { PublicSection } from "../schema";

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * One section of a mock, as in the real test: its own clock, answers kept as they are chosen,
 * each recording played once, and no going back once the section is finished or time is up.
 */
export function MockExam({
  attemptId,
  section,
  place,
  endsAt,
  initial,
  played: playedBefore,
  audio,
}: {
  attemptId: string;
  section: PublicSection;
  /** "Section 2 of 4". */
  place: string;
  endsAt: number;
  initial: Record<string, string>;
  played: string[];
  audio: Record<string, string>;
}) {
  const t = useTranslations("Mocks");
  const router = useRouter();
  const [answers, setAnswers] = useState(initial);
  const [played, setPlayed] = useState(playedBefore);
  const [left, setLeft] = useState(() => endsAt - Date.now());
  const [sure, setSure] = useState(false);
  const [pending, start] = useTransition();
  const ended = useRef(false);
  const questions = section.groups.flatMap((g) => g.questions);
  const empty = questions.filter((q) => !answers[q.id]).length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const ms = endsAt - Date.now();
      setLeft(ms);
      if (ms <= 0 && !ended.current) {
        ended.current = true;
        toast.info(t("timeUp"));
        router.refresh(); // the server closes the section and opens the next one
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt, router, t]);

  const choose = (id: string, letter: string) => {
    setAnswers((a) => ({ ...a, [id]: letter }));
    void answerMock(attemptId, id, letter).then((r) => {
      if (!r.ok) toast.error(t("notSaved"));
      else if (!r.data?.open) router.refresh();
    });
  };
  const play = (track: string) =>
    start(async () => {
      const r = await playMockTrack(attemptId, track);
      setPlayed((p) => [...p, track]);
      if (!r.ok || !r.data?.play || !audio[track] || !playRecording(audio[track]))
        toast.error(t("cantPlay"));
    });
  const leave = () =>
    start(async () => {
      const r = await leaveSection(attemptId);
      if (!r.ok) return void toast.error(t("notSaved"));
      setSure(false);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5" data-mock-section={section.n}>
      <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-md backdrop-blur">
        <p className="font-bold">
          {place} · {section.name}
        </p>
        <p
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 font-mono text-lg font-bold text-primary-foreground"
          data-mock-clock
          aria-live="off"
          suppressHydrationWarning
        >
          <Clock aria-hidden className="size-4" />
          {clock(left)}
        </p>
        <ol className="flex w-full flex-wrap gap-1" aria-label={t("palette")}>
          {questions.map((q) => (
            <li key={q.id}>
              <a
                href={`#${q.id}`}
                data-answered={!!answers[q.id]}
                className="flex size-8 items-center justify-center rounded-md border border-border text-xs font-semibold data-[answered=true]:bg-primary data-[answered=true]:text-primary-foreground"
              >
                {q.n}
              </a>
            </li>
          ))}
        </ol>
      </div>
      {section.groups.map((g) => (
        <section
          key={g.id}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
        >
          {g.title && <h3 className="text-lg font-bold">{g.title}</h3>}
          {g.text && (
            <div dir="ltr" className="flex flex-col gap-2 text-start text-lg leading-relaxed">
              {g.text.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          {g.track && (
            <Button
              variant="outline"
              className="self-start"
              disabled={pending || played.includes(g.track)}
              onClick={() => play(g.track ?? "")}
              data-track={g.track}
            >
              <Play aria-hidden className="size-4" />
              {played.includes(g.track) ? t("played") : t("playOnce")}
            </Button>
          )}
          <ol className="flex flex-col gap-5">
            {g.questions.map((q) => (
              <li
                key={q.id}
                id={q.id}
                data-question={q.id}
                className="flex scroll-mt-40 flex-col gap-2"
              >
                <p dir="ltr" className="text-start font-semibold whitespace-pre-line">
                  {q.n}. {q.stem}
                </p>
                <div
                  role="radiogroup"
                  aria-label={`${t("question")} ${q.n}`}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {Object.entries(q.options).map(([letter, text]) => (
                    <button
                      key={letter}
                      type="button"
                      role="radio"
                      aria-checked={answers[q.id] === letter}
                      onClick={() => choose(q.id, letter)}
                      dir="ltr"
                      className="min-h-11 rounded-xl border-2 border-border bg-background px-3 py-2 text-start text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:border-primary aria-checked:bg-primary/10 aria-checked:font-semibold"
                    >
                      {letter.toUpperCase()}. {text}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        {!sure ? (
          <Button size="lg" onClick={() => setSure(true)} disabled={pending}>
            {t("finishSection")}
          </Button>
        ) : (
          <>
            <p className="font-semibold" role="alert">
              {empty ? t("sureEmpty", { n: empty }) : t("sure")}
            </p>
            <Button size="lg" onClick={leave} disabled={pending} data-confirm-leave>
              {t("yesFinish")}
            </Button>
            <Button variant="outline" onClick={() => setSure(false)}>
              {t("keepWorking")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
