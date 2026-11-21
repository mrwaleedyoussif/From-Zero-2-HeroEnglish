/** Unwrap a Supabase result or throw with the failing step (import aborts loudly). */
export function must<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  if (result.error || result.data === null)
    throw new Error(`Import failed at ${what}`, { cause: result.error });
  return result.data;
}
