// Shared playback-state maths.
//
// The room has exactly one authoritative state — media, position, playing flag —
// and every client converges on it. The subtlety is that a position is only
// meaningful together with *when* it was measured: while a video plays, the
// server does not tick the stored position, so a client that receives
// "12.5s, playing, measured 40s ago" belongs at 52.5s, not 12.5s.

/** Don't extrapolate past this; beyond it the stored state is simply stale. */
const MAX_COMPENSATION_SECONDS = 6 * 60 * 60;

/**
 * Bring any playback-state shape onto one internal form. Sources differ:
 * the WebSocket event carries `positionAtServerMillis`, the REST view carries an
 * ISO `updatedAt`, and the mock backend carries epoch-millis `updatedAt`.
 */
export function normalizePlaybackState(raw) {
  if (!raw) return null;
  return {
    roomId: raw.roomId ?? null,
    mediaId: raw.mediaId ?? null,
    currentTimeSeconds: Number(raw.currentTimeSeconds) || 0,
    isPlaying: Boolean(raw.isPlaying),
    positionAtServerMillis: measuredAtMillis(raw),
    updatedByUserId: raw.updatedByUserId ?? null,
  };
}

function measuredAtMillis(raw) {
  if (Number.isFinite(raw.positionAtServerMillis)) return raw.positionAtServerMillis;
  if (Number.isFinite(raw.serverTimeMillis)) return raw.serverTimeMillis;
  if (Number.isFinite(raw.updatedAt)) return raw.updatedAt;
  if (typeof raw.updatedAt === "string") {
    const parsed = Date.parse(raw.updatedAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Where a follower should actually be, given the state and the current time on
 * the server's clock. Advances the stored position by the time elapsed since it
 * was measured — which is what lets someone joining an hour into a film land in
 * the right place instead of at the last seek.
 */
export function resolvePlaybackPosition(state, nowMillis) {
  const base = Number(state?.currentTimeSeconds) || 0;
  if (!state?.isPlaying || !Number.isFinite(state.positionAtServerMillis)) {
    return base;
  }
  const elapsedSeconds = (nowMillis - state.positionAtServerMillis) / 1000;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return base;
  }
  return base + Math.min(elapsedSeconds, MAX_COMPENSATION_SECONDS);
}
