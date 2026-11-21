import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Billing adapter (SPEC §13). The real provider (Stripe, Paddle, Moyasar, Tap, …) is chosen
 * when the business starts charging; until then the stub answers and BILLING_ENABLED=false.
 */
export interface BillingProvider {
  readonly name: string;
  createCheckout(input: {
    schoolId: string;
    planKey: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  handleWebhook(request: Request): Promise<{ handled: boolean }>;
  cancel(subscriptionRef: string): Promise<void>;
  portalUrl(subscriptionRef: string, returnUrl: string): Promise<string | null>;
}

export class BillingDisabledError extends Error {
  constructor() {
    super("Billing is switched off (BILLING_ENABLED=false)");
    this.name = "BillingDisabledError";
  }
}

export const stubProvider: BillingProvider = {
  name: "stub",
  async createCheckout() {
    throw new BillingDisabledError();
  },
  async handleWebhook() {
    return { handled: false };
  },
  async cancel() {
    throw new BillingDisabledError();
  },
  async portalUrl() {
    return null;
  },
};

/** The active provider. Only the stub exists until a real provider is chosen. */
export function billingProvider(): BillingProvider {
  if (serverEnv().BILLING_ENABLED) {
    // A real provider adapter is wired in here when charging starts (SPEC §13).
    return stubProvider;
  }
  return stubProvider;
}
