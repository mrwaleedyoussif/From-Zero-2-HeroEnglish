"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, startTransition, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

type Result = { ok: true; message?: string } | { ok: false; error: string } | null;

/**
 * Form bound to a server action returning ActionResult. Shows success/failure as a toast
 * (messages from the `Errors` / `Done` namespaces) and resets on success.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage = "saved",
  resetOnSuccess = true,
}: {
  action: (prev: Result, form: FormData) => Promise<Result>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
}) {
  const tErrors = useTranslations("Errors");
  const tDone = useTranslations("Done");
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(tDone(state.message ?? successMessage));
      if (resetOnSuccess) ref.current?.reset();
    } else {
      toast.error(tErrors(state.error));
    }
  }, [state, tDone, tErrors, successMessage, resetOnSuccess]);

  return (
    <form
      ref={ref}
      className={className}
      aria-busy={pending}
      // Submit via a transition instead of action={...}: React would otherwise clear the
      // fields even when the action failed. We reset only on success (see effect above).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
