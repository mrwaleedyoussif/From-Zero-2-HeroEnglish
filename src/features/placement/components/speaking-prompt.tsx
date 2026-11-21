"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { speakingAction } from "../runtime/actions";
import type { PublicItem } from "../runtime/public-item";

const MAX_MS = 120_000;

/** Speaking prompt: record up to 2 minutes with MediaRecorder, listen back, then send. */
export function SpeakingPrompt({ sessionId, item }: { sessionId: string; item: PublicItem }) {
  const t = useTranslations("Placement");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "unsupported">("idle");
  const [clip, setClip] = useState<{ blob: Blob; url: string; ms: number } | null>(null);
  const [pending, start] = useTransition();
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);

  useEffect(() => () => recorder.current?.stream.getTracks().forEach((track) => track.stop()), []);

  async function record() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        setClip({ blob, url: URL.createObjectURL(blob), ms: Date.now() - startedAt.current });
        setState("recorded");
      };
      recorder.current = rec;
      startedAt.current = Date.now();
      rec.start();
      setState("recording");
      setTimeout(() => rec.state === "recording" && rec.stop(), MAX_MS);
    } catch {
      toast.error(t("micDenied"));
    }
  }

  function send() {
    if (!clip) return;
    start(async () => {
      const form = new FormData();
      form.set("sessionId", sessionId);
      form.set("itemId", item.id);
      form.set("durationMs", String(clip.ms));
      form.set("audio", new File([clip.blob], "answer.webm", { type: clip.blob.type }));
      const r = await speakingAction(form);
      if (r.ok) router.refresh();
      else toast.error(tErrors(r.error));
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`s-${item.id}`}>
      <h2 id={`s-${item.id}`} className="text-lg font-semibold">
        {t("speakingTitle")}
      </h2>
      <p dir="ltr" className="text-start text-xl">
        {item.stem}
      </p>
      {state === "unsupported" && <p role="alert">{t("noRecorder")}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {state !== "recording" ? (
          <Button variant="outline" onClick={record} disabled={pending}>
            {clip ? t("recordAgain") : t("record")}
          </Button>
        ) : (
          <Button variant="destructive" onClick={() => recorder.current?.stop()}>
            {t("stop")}
          </Button>
        )}
        {state === "recording" && <span role="status">{t("recording")}</span>}
        {clip && <audio controls src={clip.url} aria-label={t("yourRecording")} />}
        {clip && (
          <Button onClick={send} disabled={pending}>
            {t("send")}
          </Button>
        )}
      </div>
    </section>
  );
}
