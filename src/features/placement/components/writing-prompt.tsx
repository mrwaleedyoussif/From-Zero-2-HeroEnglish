"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { writingAction } from "../runtime/actions";
import type { PublicItem } from "../runtime/public-item";

export function WritingPrompt({ sessionId, item }: { sessionId: string; item: PublicItem }) {
  const t = useTranslations("Placement");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`p-${item.id}`}>
      <h2 id={`p-${item.id}`} className="text-lg font-semibold">
        {t("writingTitle")}
      </h2>
      <p dir="ltr" className="text-start text-xl">
        {item.stem}
      </p>
      <Label htmlFor={`w-${item.id}`} className="sr-only">
        {t("yourAnswer")}
      </Label>
      <Textarea
        id={`w-${item.id}`}
        dir="ltr"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={5000}
        className="text-lg"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{t("words", { count: words })}</span>
        <Button
          disabled={pending || words === 0}
          onClick={() =>
            start(async () => {
              const r = await writingAction({ sessionId, itemId: item.id, text });
              if (r.ok) router.refresh();
              else toast.error(tErrors(r.error));
            })
          }
        >
          {t("send")}
        </Button>
      </div>
    </section>
  );
}
