// Media URL parsing & normalization: distinguish YouTube from direct video URLs
// and produce an embeddable form for each.

export const MEDIA_TYPES = {
  YOUTUBE: "YOUTUBE",
  VIDEO: "VIDEO",
};

const YT_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"];

/**
 * Extract a YouTube video id from a variety of URL shapes:
 *  - https://www.youtube.com/watch?v=ID
 *  - https://youtu.be/ID
 *  - https://www.youtube.com/embed/ID
 *  - https://www.youtube.com/shorts/ID
 *  - https://www.youtube.com/live/ID
 * Returns null if not a recognizable YouTube URL.
 */
export function parseYouTubeId(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!YT_HOSTS.includes(host)) return null;

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return id || null;
  }

  const v = url.searchParams.get("v");
  if (v) return v;

  const segments = url.pathname.split("/").filter(Boolean);
  const keyed = ["embed", "shorts", "live", "v"];
  if (segments.length >= 2 && keyed.includes(segments[0])) {
    return segments[1];
  }
  return null;
}

/** True when the URL looks like a directly-playable video file. */
export function isDirectVideoUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl.trim());
    return /\.(mp4|webm|ogg|ogv|mov|m4v|m3u8)(\?.*)?$/i.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

/**
 * Detect the media type from a URL.
 * YouTube wins if it parses as YouTube; otherwise anything else is treated as
 * a direct VIDEO url (best-effort for a demo).
 */
export function detectMediaType(rawUrl) {
  if (parseYouTubeId(rawUrl)) return MEDIA_TYPES.YOUTUBE;
  return MEDIA_TYPES.VIDEO;
}

/**
 * Normalize a raw URL into a descriptor the player can consume.
 * Returns { ok, type, url, embedUrl, videoId, title, error }.
 */
export function normalizeMediaUrl(rawUrl) {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a media URL." };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return { ok: false, error: "Only http(s) URLs are supported." };
  }

  const youTubeId = parseYouTubeId(trimmed);
  if (youTubeId) {
    return {
      ok: true,
      type: MEDIA_TYPES.YOUTUBE,
      url: trimmed,
      videoId: youTubeId,
      embedUrl: `https://www.youtube.com/embed/${youTubeId}`,
      title: `YouTube · ${youTubeId}`,
    };
  }

  return {
    ok: true,
    type: MEDIA_TYPES.VIDEO,
    url: trimmed,
    videoId: null,
    embedUrl: trimmed,
    title: filenameFromUrl(parsed),
  };
}

/** Build a YouTube embed URL with the desired autoplay / start position. */
export function youTubeEmbedSrc(videoId, { autoplay = false, start = 0, mute = false } = {}) {
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    autoplay: autoplay ? "1" : "0",
  });
  if (start > 0) params.set("start", String(Math.floor(start)));
  if (mute) params.set("mute", "1");
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/** A friendly label for a media item given its stored fields. */
export function mediaLabel(media) {
  if (!media) return "Untitled";
  if (media.title) return media.title;
  if (media.mediaType === MEDIA_TYPES.YOUTUBE) {
    const id = parseYouTubeId(media.mediaUrl);
    return id ? `YouTube · ${id}` : "YouTube video";
  }
  try {
    return filenameFromUrl(new URL(media.mediaUrl));
  } catch {
    return media.mediaUrl || "Untitled";
  }
}

function filenameFromUrl(url) {
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (last) return decodeURIComponent(last);
  return url.hostname;
}
