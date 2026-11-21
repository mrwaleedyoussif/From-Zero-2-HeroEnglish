/**
 * Exponential backoff for Drive/Sheets quota and transient errors (SPEC §5).
 * Retries 429, 5xx and 403 rate-limit errors; everything else fails at once.
 */

interface ErrorLike {
  code?: number | string;
  status?: number;
  response?: { status?: number };
  errors?: { reason?: string }[];
}

const RATE_LIMIT_REASONS = new Set(["rateLimitExceeded", "userRateLimitExceeded", "backendError"]);

export function isRetryable(error: unknown): boolean {
  const e = (error ?? {}) as ErrorLike;
  const status = Number(e.response?.status ?? e.status ?? e.code);
  if (status === 429 || (status >= 500 && status <= 599)) return true;
  if (status === 403)
    return (e.errors ?? []).some((x) => x.reason && RATE_LIMIT_REASONS.has(x.reason));
  return false;
}

export interface BackoffOptions {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export async function withBackoff<T>(fn: () => Promise<T>, opts: BackoffOptions = {}): Promise<T> {
  const { retries = 5, baseMs = 500, maxMs = 16_000 } = opts;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = opts.random ?? Math.random;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error;
      // Full jitter: wait a random time up to base·2^attempt (capped).
      await sleep(Math.round(random() * Math.min(maxMs, baseMs * 2 ** attempt)));
    }
  }
}
