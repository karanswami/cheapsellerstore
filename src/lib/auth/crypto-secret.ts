import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { getEnv } from "@/lib/env";

function deriveKey(material: string) {
  return createHash("sha256").update(`drip-secret:${material}`).digest();
}

/** Legacy key (derived from the session secret) — still accepted for decrypting old values. */
function legacyKey() {
  return deriveKey(getEnv().customerSessionSecret);
}

/** Current key: dedicated DATA_ENCRYPTION_KEY when set, otherwise the legacy key. */
function encryptionKey() {
  const dedicated = process.env.DATA_ENCRYPTION_KEY?.trim();
  return dedicated ? deriveKey(dedicated) : legacyKey();
}

/** Encrypt a UTF-8 string → base64(iv|tag|ciphertext). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Decrypt a base64(iv|tag|ciphertext) payload → UTF-8 string. */
export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < 28) {
    throw new Error("Corrupt secret payload.");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const attempt = (key: Buffer) => {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  };
  try {
    return attempt(encryptionKey());
  } catch (e) {
    // Written before DATA_ENCRYPTION_KEY existed? Try the legacy key.
    if (process.env.DATA_ENCRYPTION_KEY?.trim()) return attempt(legacyKey());
    throw e;
  }
}
