import { useEffect, useRef, useState, useCallback } from "react";
import { MEDIA_TYPES, parseYouTubeId } from "../../lib/media";
import { serverNow } from "../../api/realtime/stompClient";
import { resolvePlaybackPosition } from "../../lib/playback";
import useInterval from "../../hooks/useInterval";

// Threshold (seconds) beyond which a player re-seeks to stay in sync. Tighter
// than the polling-era 1.5s: state now arrives in one hop and positions are
// stored to the millisecond, so a smaller correction is both achievable and
// less likely to fight the player.
const DRIFT_TOLERANCE = 0.75;

/**
 * The position this client should be at *now* — the shared position advanced by
 * however long ago it was measured on the host's clock. Without this, everyone
 * who joins mid-video lands at the host's last seek rather than where the host
 * actually is.
 */
function targetPosition(state) {
  return resolvePlaybackPosition(state, serverNow());
}

// How often a follower re-checks itself against the shared clock.
const DRIFT_CHECK_INTERVAL_MS = 5000;
// Looser than a state change: this runs during steady playback, where small
// wobble is normal and re-seeking would be worse than the drift.
const DRIFT_CORRECTION_THRESHOLD = DRIFT_TOLERANCE * 2;

/**
 * Nothing is pushed while a video simply plays, so a follower that buffers or
 * gets throttled in a background tab falls quietly behind. Because the shared
 * state says when its position was measured, the correct position is knowable at
 * any moment — so followers re-check themselves on a timer.
 */
function useDriftCorrection({ enabled, state, readPosition, seek }) {
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useInterval(
    () => {
      const current = stateRef.current;
      if (!current?.isPlaying) return;
      const actual = readPosition();
      if (!Number.isFinite(actual)) return;
      const target = targetPosition(current);
      if (Math.abs(actual - target) > DRIFT_CORRECTION_THRESHOLD) {
        seek(target);
      }
    },
    enabled ? DRIFT_CHECK_INTERVAL_MS : null,
  );
}

/**
 * Synchronized video surface. Supports YouTube (via the IFrame Player API,
 * lazily injected) and direct <video> files.
 *
 * Props:
 *  - media: { mediaType, mediaUrl }
 *  - state: { currentTimeSeconds, isPlaying }  (the shared room state)
 *  - isHost: boolean — hosts drive playback; others follow read-only
 *  - onHostChange({ currentTimeSeconds, isPlaying }) — host emits changes
 */
export default function VideoPlayer({ media, state, isHost, onHostChange }) {
  if (!media) {
    return (
      <PlayerFrame>
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <span className="text-4xl">🎞️</span>
          <p className="kicker text-mint">Nothing playing yet</p>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted">
            {isHost
              ? "Add a video to the queue and select it to start the party."
              : "Waiting for the host to start something."}
          </p>
        </div>
      </PlayerFrame>
    );
  }

  if (media.mediaType === MEDIA_TYPES.YOUTUBE) {
    return (
      <YouTubePlayer
        key={media.id || media.mediaUrl}
        media={media}
        state={state}
        isHost={isHost}
        onHostChange={onHostChange}
      />
    );
  }
  return (
    <NativeVideoPlayer
      key={media.id || media.mediaUrl}
      media={media}
      state={state}
      isHost={isHost}
      onHostChange={onHostChange}
    />
  );
}

function PlayerFrame({ children, overlay }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[24px] border border-frame bg-black">
      {children}
      {overlay}
    </div>
  );
}

/** Read-only overlay shown to non-hosts so they know the host is in control. */
function GuestOverlay() {
  return (
    <div className="kicker pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-[20px] bg-canvas/80 px-2.5 py-1.5 text-muted-2 backdrop-blur">
      <svg className="h-3.5 w-3.5 text-mint" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1zm3 8V5.5a3 3 0 1 0-6 0V9h6z" clipRule="evenodd" />
      </svg>
      Host controls playback
    </div>
  );
}

// ---------------------------------------------------------------------------
// Native <video> player
// ---------------------------------------------------------------------------

function NativeVideoPlayer({ media, state, isHost, onHostChange }) {
  const ref = useRef(null);
  const applyingRemote = useRef(false);

  // Follow the shared state (all clients, including a fresh host mount).
  useEffect(() => {
    const el = ref.current;
    if (!el || !state) return;
    applyingRemote.current = true;

    const target = targetPosition(state);
    if (Math.abs(el.currentTime - target) > DRIFT_TOLERANCE) {
      el.currentTime = target;
    }
    if (state.isPlaying && el.paused) {
      el.play().catch(() => {});
    } else if (!state.isPlaying && !el.paused) {
      el.pause();
    }

    const t = setTimeout(() => {
      applyingRemote.current = false;
    }, 250);
    return () => clearTimeout(t);
    // Only re-sync when the meaningful playback fields change, not on object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.currentTimeSeconds, state?.isPlaying]);

  useDriftCorrection({
    enabled: !isHost,
    state,
    readPosition: () => ref.current?.currentTime ?? NaN,
    seek: (target) => {
      if (ref.current) ref.current.currentTime = target;
    },
  });

  const emit = useCallback(
    (patch) => {
      if (!isHost || applyingRemote.current) return;
      const el = ref.current;
      onHostChange?.({
        currentTimeSeconds: el ? el.currentTime : 0,
        isPlaying: el ? !el.paused : false,
        ...patch,
      });
    },
    [isHost, onHostChange],
  );

  return (
    <PlayerFrame overlay={!isHost && <GuestOverlay />}>
      <video
        ref={ref}
        src={media.mediaUrl}
        controls={isHost}
        playsInline
        className="h-full w-full bg-black"
        onPlay={() => emit({ isPlaying: true })}
        onPause={() => emit({ isPlaying: false })}
        onSeeked={() => emit({})}
      />
      {/* Block guest interaction so only the host drives playback. */}
      {!isHost && <div className="absolute inset-0 z-[5] cursor-not-allowed" aria-hidden="true" />}
    </PlayerFrame>
  );
}

// ---------------------------------------------------------------------------
// YouTube IFrame API player (lazily loaded)
// ---------------------------------------------------------------------------

let ytApiPromise = null;
function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function YouTubePlayer({ media, state, isHost, onHostChange }) {
  const hostElRef = useRef(null);
  const playerRef = useRef(null);
  const applyingRemote = useRef(false);
  const [ready, setReady] = useState(false);
  const videoId = parseYouTubeId(media.mediaUrl);

  const stateRef = useRef(state);
  stateRef.current = state;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  // Create the player once per mounted media.
  useEffect(() => {
    let cancelled = false;
    if (!videoId) return undefined;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostElRef.current) return;
      playerRef.current = new YT.Player(hostElRef.current, {
        videoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: isHostRef.current ? 1 : 0,
          disablekb: isHostRef.current ? 0 : 1,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            const s = stateRef.current;
            if (s) {
              // The player can take seconds to load; seek to where the room is
              // by now, not to where it was when the state arrived.
              playerRef.current.seekTo(targetPosition(s), true);
              if (s.isPlaying) playerRef.current.playVideo();
            }
          },
          onStateChange: (event) => {
            if (!isHostRef.current || applyingRemote.current) return;
            const YTP = window.YT.PlayerState;
            const player = playerRef.current;
            const currentTimeSeconds = player.getCurrentTime?.() || 0;
            if (event.data === YTP.PLAYING) {
              onHostChange?.({ currentTimeSeconds, isPlaying: true });
            } else if (event.data === YTP.PAUSED) {
              onHostChange?.({ currentTimeSeconds, isPlaying: false });
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Follow shared state for everyone (host on remote-origin updates, guests always).
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player || !state) return;
    applyingRemote.current = true;

    try {
      const now = player.getCurrentTime?.() || 0;
      const target = targetPosition(state);
      if (Math.abs(now - target) > DRIFT_TOLERANCE) {
        player.seekTo(target, true);
      }
      const ps = player.getPlayerState?.();
      const YTP = window.YT?.PlayerState;
      if (state.isPlaying && ps !== YTP?.PLAYING) {
        player.playVideo();
      } else if (!state.isPlaying && ps === YTP?.PLAYING) {
        player.pauseVideo();
      }
    } catch {
      /* ignore */
    }

    const t = setTimeout(() => {
      applyingRemote.current = false;
    }, 400);
    return () => clearTimeout(t);
    // Only re-sync when the meaningful playback fields change, not on object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state?.currentTimeSeconds, state?.isPlaying]);

  useDriftCorrection({
    enabled: !isHost && ready,
    state,
    readPosition: () => playerRef.current?.getCurrentTime?.() ?? NaN,
    seek: (target) => playerRef.current?.seekTo?.(target, true),
  });

  if (!videoId) {
    return (
      <PlayerFrame>
        <div className="kicker flex h-full items-center justify-center text-violet">
          Couldn't parse that YouTube URL.
        </div>
      </PlayerFrame>
    );
  }

  return (
    <PlayerFrame overlay={!isHost && <GuestOverlay />}>
      <div className="h-full w-full">
        <div ref={hostElRef} className="h-full w-full" />
      </div>
      {!ready && (
        <div className="kicker absolute inset-0 flex items-center justify-center bg-black/60 text-muted">
          Loading player…
        </div>
      )}
      {/* Block guest clicks so only host drives playback. */}
      {!isHost && <div className="absolute inset-0 z-[5] cursor-not-allowed" aria-hidden="true" />}
    </PlayerFrame>
  );
}
