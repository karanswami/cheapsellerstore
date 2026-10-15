import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "@/lib/env";

const STORAGE_DIR = path.join(process.cwd(), "storage", "avatars");
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function avatarUploadLimits() {
  return { maxBytes: MAX_BYTES, allowed: [...ALLOWED.keys()] };
}

function encryptionKey() {
  return createHash("sha256")
    .update(getEnv().customerSessionSecret)
    .digest();
}

function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decryptBuffer(payload: Buffer): Buffer {
  if (payload.length < 28) {
    throw new Error("Corrupt avatar file.");
  }
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/** Opaque media path served only via authenticated API. */
export function avatarMediaPath(id: string, ext: string) {
  return `/api/media/avatar/${id}.${ext}`;
}

export function parseAvatarMediaId(raw: string): { id: string; ext: string } | null {
  const match = /^([a-f0-9]{24,64})\.(jpg|jpeg|png|webp|gif)$/i.exec(raw);
  if (!match) return null;
  return { id: match[1]!.toLowerCase(), ext: match[2]!.toLowerCase() };
}

export async function saveAvatarUpload(file: File) {
  const mime = file.type;
  const ext = ALLOWED.get(mime);
  if (!ext) {
    throw new Error("Use a JPG, PNG, WebP, or GIF image.");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("Image must be 2 MB or smaller.");
  }

  await mkdir(STORAGE_DIR, { recursive: true });
  const id = randomBytes(16).toString("hex");
  const diskName = `${id}.${ext}.enc`;
  const diskPath = path.join(STORAGE_DIR, diskName);

  const plain = Buffer.from(await file.arrayBuffer());
  const encrypted = encryptBuffer(plain);
  await writeFile(diskPath, encrypted);

  return {
    url: avatarMediaPath(id, ext),
    id,
    ext,
    mime,
  };
}

export async function readEncryptedAvatar(
  id: string,
  ext: string,
): Promise<{ buffer: Buffer; mime: string }> {
  const safeExt = EXT_MIME[ext] ? ext : null;
  if (!safeExt || !/^[a-f0-9]{24,64}$/.test(id)) {
    throw new Error("Not found.");
  }

  const diskPath = path.join(STORAGE_DIR, `${id}.${safeExt}.enc`);
  const resolved = path.resolve(diskPath);
  if (!resolved.startsWith(path.resolve(STORAGE_DIR) + path.sep)) {
    throw new Error("Not found.");
  }

  const encrypted = await readFile(resolved);
  const buffer = decryptBuffer(encrypted);
  return { buffer, mime: EXT_MIME[safeExt]! };
}
