/**
 * Entitlements (SPEC §13). Pure. A plan grants registry keys (module.*, feature.*, limit.*)
 * or "*" (everything). With billing off, every school is evaluated on the free plan —
 * the checks still run, the free plan simply grants everything.
 */

export interface Entitlement {
  key: string;
  limit_value: number | null;
}

function find(entitlements: readonly Entitlement[], key: string): Entitlement | undefined {
  return entitlements.find((e) => e.key === key) ?? entitlements.find((e) => e.key === "*");
}

export function grants(entitlements: readonly Entitlement[], key: string): boolean {
  return find(entitlements, key) !== undefined;
}

/** Numeric cap for a limit.* key: Infinity when unlimited, 0 when not granted. */
export function limitOf(entitlements: readonly Entitlement[], key: string): number {
  const e = find(entitlements, key);
  if (!e) return 0;
  return e.limit_value ?? Number.POSITIVE_INFINITY;
}

/** Which plan's entitlements to use for a school. */
export function effectivePlanKey(billingEnabled: boolean, schoolPlanKey: string | null): string {
  return billingEnabled && schoolPlanKey ? schoolPlanKey : "free";
}

/** "Free until" banner: shown once the date has passed. Dates are YYYY-MM-DD (school-local). */
export function freePeriodEnded(freeUntil: string | null, today: string): boolean {
  return freeUntil !== null && freeUntil < today;
}
