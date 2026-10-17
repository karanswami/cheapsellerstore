import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Root for runtime-uploaded public images (not snapshotted by `next start`). */
export const PUBLIC_UPLOADS_ROOT = path.join(
  process.cwd(),
  "public",
  "uploads",
);

const BANNER_DIR = path.join(PUBLIC_UPLOADS_ROOT, "banners");
const PRODUCT_DIR = path.join(PUBLIC_UPLOADS_ROOT, "products");
const SUPPORT_DIR = path.join(PUBLIC_UPLOADS_ROOT, "support");
const SITE_DIR = path.join(PUBLIC_UPLOADS_ROOT, "site");
const DEPOSIT_DIR = path.join(PUBLIC_UPLOADS_ROOT, "deposits");
const ICON_DIR = path.join(PUBLIC_UPLOADS_ROOT, "icons");
const SOUND_DIR = path.join(PUBLIC_UPLOADS_ROOT, "sounds");
const MAX_BYTES = 4 * 1024 * 1024;
const SOUND_MAX_BYTES = 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
]);
const SOUND_ALLOWED = new Map([
  ["audio/mpeg", "mp3"],
  ["audio/mp3", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/wave", "wav"],
  ["audio/ogg", "ogg"],
  ["audio/webm", "webm"],
  ["audio/mp4", "m4a"],
  ["audio/aac", "aac"],
]);
/** Verify the bytes really are the declared image type (client `file.type` is attacker-controlled). */
function matchesImageSignature(ext: string, b: Buffer) {
  if (ext === "jpg") return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === "png") {
    return b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (ext === "webp") {
    return b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
  }
  if (ext === "ico") return b.length > 4 && b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0;
  return false;
}

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
  m4a: "audio/mp4",
  aac: "audio/aac",
};

export function bannerUploadLimits() {
  return {
    maxBytes: MAX_BYTES,
    allowed: ["image/jpeg", "image/png", "image/webp"],
  };
}

export function productUploadLimits() {
  return {
    maxBytes: MAX_BYTES,
    allowed: ["image/jpeg", "image/png", "image/webp"],
  };
}

export function supportUploadLimits() {
  return {
    maxBytes: MAX_BYTES,
    allowed: ["image/jpeg", "image/png", "image/webp"],
  };
}

export function siteUploadLimits() {
  return { maxBytes: MAX_BYTES, allowed: [...ALLOWED.keys()] };
}

export function isBannerImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return true;
  return /^\/uploads\/banners\/[a-zA-Z0-9._-]+$/i.test(value);
}

export function isProductImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return true;
  return /^\/uploads\/products\/[a-zA-Z0-9._-]+$/i.test(value);
}

export function isSupportImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return true;
  return /^\/uploads\/support\/[a-zA-Z0-9._-]+$/i.test(value);
}

export function isSiteImageUrl(value: string) {
  if (!value.trim()) return true;
  if (/^https?:\/\//i.test(value)) return true;
  return /^\/uploads\/site\/[a-zA-Z0-9._-]+$/i.test(value);
}

export function depositQrUploadLimits() {
  return {
    maxBytes: MAX_BYTES,
    allowed: ["image/jpeg", "image/png", "image/webp"],
  };
}

export function iconUploadLimits() {
  return {
    maxBytes: MAX_BYTES,
    allowed: ["image/jpeg", "image/png", "image/webp"],
  };
}

/** Custom uploads, built-in /icons defaults, or absolute image URLs. */
export function isIconImageUrl(value: string) {
  if (!value.trim()) return true;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^\/uploads\/icons\/[a-zA-Z0-9._-]+$/i.test(value)) return true;
  if (/^\/icons\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp)$/i.test(value)) return true;
  return false;
}

/** Admin-uploaded or default static pay QR paths / absolute image URLs. */
export function isDepositQrImageUrl(value: string) {
  if (!value.trim()) return true;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^\/uploads\/deposits\/[a-zA-Z0-9._-]+$/i.test(value)) return true;
  // Built-in public assets + optional env paths under /public
  return /^\/[a-zA-Z0-9._/-]+\.(png|jpe?g|webp)$/i.test(value);
}

async function saveImageUpload(file: File, dir: string, urlPrefix: string) {
  const mime = file.type;
  const ext = ALLOWED.get(mime);
  if (!ext) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("Image must be 4 MB or smaller.");
  }

  await mkdir(dir, { recursive: true });
  const id = randomBytes(12).toString("hex");
  const fileName = `${Date.now()}-${id}.${ext}`;
  const diskPath = path.join(dir, fileName);
  const resolved = path.resolve(diskPath);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Invalid upload path.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesImageSignature(ext, buffer)) {
    throw new Error("That file is not a valid image.");
  }
  await writeFile(resolved, buffer);

  return {
    url: `${urlPrefix}/${fileName}`,
    fileName,
    mime,
    sizeBytes: buffer.length,
  };
}

/**
 * Read a file under `public/uploads/` for the runtime `/uploads/[...path]`
 * route. `next start` only serves `public/` files present at boot — uploads
 * after start must go through this helper (or nginx alias).
 */
export async function readPublicUpload(
  segments: string[],
): Promise<{ buffer: Buffer; mime: string } | null> {
  if (
    !segments.length ||
    segments.some(
      (s) =>
        !s ||
        s === "." ||
        s === ".." ||
        s.includes("/") ||
        s.includes("\\") ||
        s.includes("\0"),
    )
  ) {
    return null;
  }

  const diskPath = path.join(PUBLIC_UPLOADS_ROOT, ...segments);
  const resolved = path.resolve(diskPath);
  const root = path.resolve(PUBLIC_UPLOADS_ROOT);
  if (
    resolved !== root &&
    !resolved.startsWith(root + path.sep)
  ) {
    return null;
  }

  const ext = path.extname(resolved).slice(1).toLowerCase();
  const mime = EXT_MIME[ext];
  if (!mime) return null;

  try {
    const buffer = await readFile(resolved);
    return { buffer, mime };
  } catch {
    return null;
  }
}

export async function saveBannerUpload(file: File) {
  return saveImageUpload(file, BANNER_DIR, "/uploads/banners");
}

export async function saveProductUpload(file: File) {
  return saveImageUpload(file, PRODUCT_DIR, "/uploads/products");
}

export async function saveSupportUpload(file: File) {
  return saveImageUpload(file, SUPPORT_DIR, "/uploads/support");
}

export async function saveSiteUpload(file: File) {
  return saveImageUpload(file, SITE_DIR, "/uploads/site");
}

export async function saveDepositQrUpload(file: File) {
  return saveImageUpload(file, DEPOSIT_DIR, "/uploads/deposits");
}

export async function saveIconUpload(file: File) {
  return saveImageUpload(file, ICON_DIR, "/uploads/icons");
}

export function feedbackSoundUploadLimits() {
  return {
    maxBytes: SOUND_MAX_BYTES,
    allowed: [...new Set(SOUND_ALLOWED.keys())],
  };
}

/** Admin-uploaded feedback audio under `/uploads/sounds/` or absolute URLs. */
export function isFeedbackSoundUrl(value: string) {
  if (!value.trim()) return true;
  if (/^https?:\/\//i.test(value)) return true;
  return /^\/uploads\/sounds\/[a-zA-Z0-9._-]+$/i.test(value);
}

export async function saveFeedbackSoundUpload(file: File) {
  const mime = file.type;
  const ext = SOUND_ALLOWED.get(mime);
  if (!ext) {
    throw new Error("Use an MP3, WAV, OGG, WebM, M4A, or AAC audio file.");
  }
  if (file.size <= 0 || file.size > SOUND_MAX_BYTES) {
    throw new Error("Audio must be 1 MB or smaller.");
  }

  await mkdir(SOUND_DIR, { recursive: true });
  const id = randomBytes(12).toString("hex");
  const fileName = `${Date.now()}-${id}.${ext}`;
  const diskPath = path.join(SOUND_DIR, fileName);
  const resolved = path.resolve(diskPath);
  if (!resolved.startsWith(path.resolve(SOUND_DIR) + path.sep)) {
    throw new Error("Invalid upload path.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(resolved, buffer);

  return {
    url: `/uploads/sounds/${fileName}`,
    fileName,
    mime,
    sizeBytes: buffer.length,
  };
}
