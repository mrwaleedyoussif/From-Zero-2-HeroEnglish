import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for stored secrets (Drive refresh token). Format: v1.<iv>.<tag>.<ciphertext>,
 * base64url parts. The key is ENCRYPTION_KEY (32 bytes, base64). Pure — the key is passed in.
 */
function key(base64Key: string): Buffer {
  const k = Buffer.from(base64Key, "base64");
  if (k.length !== 32) throw new Error("ENCRYPTION_KEY must decode to 32 bytes");
  return k;
}

export function encryptSecret(plaintext: string, base64Key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(base64Key), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function decryptSecret(token: string, base64Key: string): string {
  const [version, iv, tag, data] = token.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unknown secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(base64Key), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
