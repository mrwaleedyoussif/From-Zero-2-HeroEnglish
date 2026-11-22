import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StorageAdapter } from "./types";

/**
 * Count Drive API calls for the Owner's free-tier budget meter (SPEC §11–12). Each adapter
 * method call adds one to today's counter; counting never blocks or fails the call itself.
 */
export function countingDriveCalls(adapter: StorageAdapter): StorageAdapter {
  const bump = () => {
    void Promise.resolve(
      createAdminClient().rpc("bump_usage", { p_kind: "drive_call", p_n: 1 }),
    ).catch(() => undefined);
  };
  return new Proxy(adapter, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        bump();
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}
