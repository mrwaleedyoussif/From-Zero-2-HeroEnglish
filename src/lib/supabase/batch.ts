/**
 * Large imports (thousands of questions) must stay under two Supabase limits: the API returns at
 * most 1000 rows per request, and long `.in(...)` filters overflow the URL. These helpers page
 * reads and split writes into batches.
 */
export const BATCH = 500;
/** `.in(...)` filters travel in the URL; 100 ids (≈ 4 KB) stays well under server limits. */
export const IN_BATCH = 100;
export const PAGE = 1000;

type Result<T> = { data: T[] | null; error: { message: string } | null };

export function chunks<T>(items: readonly T[], size = BATCH): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Read every row of a query, one page at a time. Pages continue after the last key seen
 * (`page(after)` applies `.gt(key, after).order(key).limit(PAGE)`): an offset would make each
 * page slower than the last and hit the statement timeout on large tables.
 */
export async function selectAll<T>(
  page: (after: string | null) => PromiseLike<Result<T>>,
  key: (row: T) => string,
): Promise<Result<T>> {
  const all: T[] = [];
  for (let after: string | null = null; ;) {
    const { data, error } = await page(after);
    if (error || !data) return { data: null, error: error ?? { message: "no data" } };
    all.push(...data);
    const last = data.at(-1);
    if (data.length < PAGE || !last) return { data: all, error: null };
    after = key(last);
  }
}

/** Run one request per batch of `items` and join the rows each returns. */
export async function inBatches<I, T>(
  items: readonly I[],
  run: (batch: I[]) => PromiseLike<Result<T>>,
  size = BATCH,
): Promise<Result<T>> {
  const all: T[] = [];
  for (const batch of chunks(items, size)) {
    const { data, error } = await run(batch);
    if (error || !data) return { data: null, error: error ?? { message: "no data" } };
    all.push(...data);
  }
  return { data: all, error: null };
}

interface CodeQuery<Q> {
  gt(column: "code", value: string): Q;
  order(column: "code"): { limit(n: number): Q };
}
/** One keyset page of a table with a unique `code` column. */
export function byCode<Q extends CodeQuery<Q>>(query: Q, after: string | null): Q {
  return (after ? query.gt("code", after) : query).order("code").limit(PAGE);
}
