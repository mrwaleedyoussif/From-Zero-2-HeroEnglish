export type InviteState = "active" | "cancelled" | "expired" | "full";

/** What an invitation code is worth right now. */
export function inviteState(
  i: { status: string; expires_at: string | null; used: number; max_uses: number },
  now: Date = new Date(),
): InviteState {
  if (i.status === "cancelled") return "cancelled";
  if (i.expires_at && Date.parse(i.expires_at) <= now.getTime()) return "expired";
  return i.used >= i.max_uses ? "full" : "active";
}
