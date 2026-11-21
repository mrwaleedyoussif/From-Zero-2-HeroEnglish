import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * "View as user" cookie value: `<viewerId>.<targetId>.<expiresMs>.<hmac>`.
 * Bound to the viewer so a stolen cookie is useless in another session. Pure, for unit tests.
 */
const uuid = /^[0-9a-f-]{36}$/;

function mac(key: string, payload: string): string {
  return createHmac("sha256", key).update(`view-as:${payload}`).digest("base64url");
}

export function signViewAs(
  key: string,
  viewerId: string,
  targetId: string,
  expiresAt: Date,
): string {
  const payload = `${viewerId}.${targetId}.${expiresAt.getTime()}`;
  return `${payload}.${mac(key, payload)}`;
}

export function verifyViewAs(
  key: string,
  token: string | undefined,
  viewerId: string,
  now: Date = new Date(),
): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [viewer, target, expires, signature] = parts as [string, string, string, string];
  if (!uuid.test(viewer) || !uuid.test(target) || viewer !== viewerId) return null;
  if (!/^\d+$/.test(expires) || Number(expires) <= now.getTime()) return null;
  const expected = Buffer.from(mac(key, `${viewer}.${target}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return target;
}
