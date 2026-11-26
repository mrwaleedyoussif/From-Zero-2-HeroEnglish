"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

/**
 * A password or PIN box with an eye button that shows what was typed, so a learner or teacher
 * can check it before signing in. It starts hidden every time.
 */
export function SecretInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const t = useTranslations("Auth");
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className={cn("pe-11", className)} />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-pressed={shown}
        aria-label={shown ? t("hideSecret") : t("showSecret")}
        title={shown ? t("hideSecret") : t("showSecret")}
        data-show-secret
        className="absolute inset-y-0 end-0 flex w-10 items-center justify-center rounded-e-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {shown ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  );
}
