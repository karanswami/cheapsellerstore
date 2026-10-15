/**
 * Extract a YouTube video id from common watch / short / embed / youtu.be URLs.
 * Channel, playlist, and other non-video URLs return null.
 */
export function getYoutubeVideoId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return isVideoId(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && isVideoId(v)) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    const kind = parts[0];
    const id = parts[1] ?? "";

    if (
      (kind === "embed" || kind === "shorts" || kind === "live" || kind === "v") &&
      isVideoId(id)
    ) {
      return id;
    }
  }

  return null;
}

export function getYoutubeEmbedUrl(raw: string): string | null {
  const id = getYoutubeVideoId(raw);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}

function isVideoId(value: string): boolean {
  return /^[\w-]{11}$/.test(value);
}
