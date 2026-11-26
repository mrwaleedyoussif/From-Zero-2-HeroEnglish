"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { startMock } from "../actions";

/** Starts (or restarts) a sitting; the page then shows the first section and its clock. */
export function StartMock({ examId, again = false }: { examId: string; again?: boolean }) {
  const t = useTranslations("Mocks");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      data-start-mock
      onClick={() =>
        start(async () => {
          const r = await startMock(examId);
          if (!r.ok) return void toast.error(t("notSaved"));
          router.refresh();
        })
      }
    >
      {again ? t("again") : t("start")}
    </Button>
  );
}
