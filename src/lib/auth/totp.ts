import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/auth/crypto-secret";
import { hashPassword, verifyPassword } from "@/lib/auth/customer";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Cheap Seller";
const BACKUP_CODE_COUNT = 8;

export function generateTotpSecret() {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function buildTotp(secretBase32: string, accountLabel: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountLabel,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function verifyTotpCode(secretBase32: string, code: string) {
  const totp = buildTotp(secretBase32, "verify");
  const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
  return delta !== null;
}

export function encryptTotpSecret(secretBase32: string) {
  return encryptSecret(secretBase32);
}

export function decryptTotpSecret(encrypted: string) {
  return decryptSecret(encrypted);
}

export async function totpQrDataUrl(otpauthUri: string) {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
}

function formatBackupCode(raw: Buffer) {
  const hex = raw.toString("hex").slice(0, 10).toUpperCase();
  return `${hex.slice(0, 5)}-${hex.slice(5)}`;
}

export async function generateBackupCodes() {
  const codes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = formatBackupCode(randomBytes(8));
    codes.push(code);
    hashes.push(await hashPassword(normalizeBackupCode(code)));
  }
  return { codes, hashes };
}

export function normalizeBackupCode(code: string) {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

export async function consumeBackupCode(
  hashes: string[],
  code: string,
): Promise<{ ok: true; remaining: string[] } | { ok: false }> {
  const normalized = normalizeBackupCode(code);
  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i]!;
    if (await verifyPassword(normalized, hash)) {
      return {
        ok: true,
        remaining: hashes.filter((_, idx) => idx !== i),
      };
    }
  }
  return { ok: false };
}
