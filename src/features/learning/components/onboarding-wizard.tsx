"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { saveProfile } from "../profile/actions";
import type { LearnerProfile, ProfileOption } from "../profile/queries";

const STEPS = ["interest", "goal", "format", "mindset", "accommodation"] as const;
const FACES = ["😟", "🙁", "🙂", "😃"] as const;

/** Short visual onboarding (SPEC §8): tap tiles, one question per screen, editable later. */
export function OnboardingWizard({
  options,
  initial,
}: {
  options: ProfileOption[];
  initial: LearnerProfile | null;
}) {
  const t = useTranslations("Learning");
  const tErrors = useTranslations("Errors");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<Record<string, string[]>>({
    interest: initial?.interests ?? [],
    goal: initial?.goals ?? [],
    format: initial?.preferred_formats ?? [],
    accommodation: initial?.accommodations ?? [],
  });
  const [mindset, setMindset] = useState<Record<string, number>>(
    (initial?.mindset_answers as Record<string, number> | null) ?? {},
  );
  const [background, setBackground] = useState(initial?.language_background ?? "");
  const kind = STEPS[step] ?? "interest";
  const name = (o: ProfileOption) => (locale === "ar" ? o.name_ar : o.name_en);
  const toggle = (k: string, key: string) =>
    setPicked((p) => {
      const list = p[k] ?? [];
      return { ...p, [k]: list.includes(key) ? list.filter((x) => x !== key) : [...list, key] };
    });

  const finish = () =>
    start(async () => {
      const result = await saveProfile({
        interests: picked.interest,
        goals: picked.goal,
        preferred_formats: picked.format,
        accommodations: picked.accommodation,
        mindset_answers: mindset,
        language_background: background,
      });
      if (!result.ok) return void toast.error(tErrors(result.error));
      toast.success(t("saved"));
      router.push("/student/lessons");
    });

  const tiles = options.filter((o) => o.kind === kind);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6" data-step={kind}>
      <div className="flex gap-1" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={`h-2 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <h2 className="text-2xl font-semibold">{t(`wizard.${kind}`)}</h2>

      {kind === "mindset" ? (
        <div className="flex flex-col gap-4">
          {tiles.map((o) => (
            <fieldset key={o.key} className="flex flex-col gap-2">
              <legend className="mb-2 text-lg">{name(o)}</legend>
              <div className="flex gap-2">
                {FACES.map((face, i) => (
                  <label
                    key={face}
                    className="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 text-2xl has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={o.key}
                      checked={mindset[o.key] === i + 1}
                      onChange={() => setMindset((m) => ({ ...m, [o.key]: i + 1 }))}
                    />
                    <span aria-hidden>{face}</span>
                    <span className="text-xs">{t(`agree.${i + 1}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((o) => (
            <label
              key={o.key}
              className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-center text-lg has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={(picked[kind] ?? []).includes(o.key)}
                onChange={() => toggle(kind, o.key)}
              />
              <span className="text-3xl" aria-hidden>
                {o.emoji}
              </span>
              {name(o)}
            </label>
          ))}
        </div>
      )}

      {kind === "accommodation" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="background">{t("background")}</Label>
          <Input
            id="background"
            value={background}
            maxLength={200}
            onChange={(e) => setBackground(e.target.value)}
          />
        </div>
      )}

      <div className="flex justify-between gap-3">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t("previous")}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="lg" onClick={() => setStep(step + 1)}>
            {t("continue")}
          </Button>
        ) : (
          <Button size="lg" onClick={finish} disabled={pending}>
            {pending ? t("saving") : t("finish")}
          </Button>
        )}
      </div>
    </div>
  );
}
