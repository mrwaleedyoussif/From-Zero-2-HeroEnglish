import "server-only";
import { ZodError } from "zod";
import { ForbiddenError, ReadOnlyError } from "@/lib/auth/can";

/** Result every mutating server action returns; `error` is a key in the `Errors` messages. */
export type ActionResult<T = void> =
  { ok: true; data?: T; message?: string } | { ok: false; error: string };

interface DbError {
  code?: string;
  message?: string;
}

/** Map a Supabase/Postgres error to a user-facing error key. */
export function dbErrorKey(error: DbError): string {
  switch (error.code) {
    case "23505":
      return "duplicate";
    case "42501":
      return "forbidden";
    case "23503":
      return "inUse";
    case "23514":
    case "22P02":
      return "invalid";
    default:
      return "failed";
  }
}

export class ActionError extends Error {
  constructor(public readonly key: string) {
    super(key);
    this.name = "ActionError";
  }
}

/** Throw a mapped ActionError when a Supabase call returned an error. */
export function check<T extends { error: DbError | null }>(result: T): T {
  if (result.error) throw new ActionError(dbErrorKey(result.error));
  return result;
}

/** Run an action body and turn known failures into an ActionResult (unknown ones are logged). */
export async function runAction<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.key };
    if (e instanceof ForbiddenError) return { ok: false, error: "forbidden" };
    if (e instanceof ReadOnlyError) return { ok: false, error: "readOnly" };
    if (e instanceof ZodError) return { ok: false, error: "invalid" };
    // Next.js redirects/notFound are thrown errors too: let them through.
    if (e instanceof Error && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: "failed" };
  }
}
