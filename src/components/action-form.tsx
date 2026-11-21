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
  // Toast as soon as the action returns — not in an effect: a "Remove" form usually
  // disappears with the item it removed, and its effect would never run.
  const [state, formAction, pending] = useActionState(async (prev: Result, form: FormData) => {
    const result = await action(prev, form);
    if (result?.ok) toast.success(tDone(result.message ?? successMessage));
    else if (result) toast.error(tErrors(result.error));
    return result;
  }, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

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
