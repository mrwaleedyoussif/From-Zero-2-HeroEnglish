"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startTestAction } from "../runtime/actions";

export function StartButton({
  department,
  kind,
  label,
}: {
  department: string;
  kind: "placement" | "progress";
  label: string;
}) {
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await startTestAction({ department, kind });
          if (r.ok && r.data) router.push(`/${locale}/student/placement/${r.data.sessionId}`);
          else if (!r.ok) toast.error(tErrors(r.error));
        })
      }
    >
      {label}
    </Button>
  );
}
