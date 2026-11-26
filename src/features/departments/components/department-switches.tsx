"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setDepartmentState } from "../actions";
import type { Audience, DepartmentState } from "../catalog";
import { DEPARTMENT_STATES } from "../catalog";

/** Three buttons for one department: Open, Soon, Hidden. The chosen one is filled. */
export function DepartmentSwitch({
  audience,
  department,
  name,
  audienceName,
  initial,
}: {
  audience: Audience;
  department: string;
  name: string;
  audienceName: string;
  initial: DepartmentState;
}) {
  const t = useTranslations("OwnerDepartments");
  const [state, setState] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div
      role="radiogroup"
      aria-label={`${name}: ${audienceName}`}
      data-switch={`${audience}:${department}`}
      data-state={state}
      className="inline-flex overflow-hidden rounded-full border border-border"
    >
      {DEPARTMENT_STATES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={state === s}
          disabled={pending}
          data-choice={s}
          onClick={() =>
            s !== state &&
            start(async () => {
              const r = await setDepartmentState({ audience, department, state: s });
              if (!r.ok) return void toast.error(t("notSaved"));
              setState(s);
              toast.success(t("saved", { name, state: t(`state.${s}`), audience: audienceName }));
            })
          }
          className="min-h-9 px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground"
        >
          {t(`state.${s}`)}
        </button>
      ))}
    </div>
  );
}
