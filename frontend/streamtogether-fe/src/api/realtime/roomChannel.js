// Room-scoped view of the shared STOMP connection.
//
// Destinations mirror stream-service's RoomTopics: the broker filters by room,
// so a client is only sent traffic for the party it is watching.

import { normalizePlaybackState } from "../../lib/playback";
import { ROOM_EVENTS } from "./events";
import {
  STATUS,
  acquireRealtime,
  isConnected,
  onStatusChange,
  parseBody,
  publishTo,
  rawSubscribe,
  releaseRealtime,
  serverNow,
} from "./stompClient";

const topic = (roomId, suffix) => `/topic/rooms/${roomId}/${suffix}`;
const app = (roomId, suffix) => `/app/rooms/${roomId}/${suffix}`;

/**
 * Join a room's realtime channel.
 *
 * @param roomId   numeric room id (topics are keyed by id, not room code)
 * @param emit     (eventName, payload) => void — one of ROOM_EVENTS
 * @param identity { displayName, avatarUrl } decoration for presence; identity
 *                 itself is taken from the JWT server-side
 * @returns unsubscribe function
 */
export function subscribeToRoom(roomId, emit, identity = {}) {
  acquireRealtime();

  const unsubscribers = [
    rawSubscribe(topic(roomId, "state"), (frame) =>
      emitState(emit, parseBody(frame)),
    ),
    // Direct reply to our own sync request (and to a rejected command).
    rawSubscribe("/user/queue/state", (frame) => emitState(emit, parseBody(frame))),

    rawSubscribe(topic(roomId, "chat"), (frame) => {
      const message = parseBody(frame);
      if (message) emit(ROOM_EVENTS.CHAT_MESSAGE, message);
    }),

    rawSubscribe(topic(roomId, "presence"), (frame) => {
      const presence = parseBody(frame);
      if (presence) emit(ROOM_EVENTS.PRESENCE_UPDATE, presence);
    }),

    rawSubscribe(topic(roomId, "media"), (frame) => {
      emit(ROOM_EVENTS.MEDIA_ADDED, parseBody(frame));
    }),

    rawSubscribe("/user/queue/errors", (frame) => {
      const error = parseBody(frame);
      if (error) emit(ROOM_EVENTS.REALTIME_ERROR, error);
    }),
  ];

  // Announce ourselves and pull the current state on every connect — not just
  // the first — so a reconnect re-registers presence and re-converges playback.
  const stopWatchingStatus = onStatusChange((status) => {
    if (status !== STATUS.CONNECTED) return;
    publishTo(app(roomId, "presence/join"), {
      displayName: identity.displayName ?? null,
      avatarUrl: identity.avatarUrl ?? null,
    });
    publishTo(app(roomId, "sync"), {});
  });

  return () => {
    stopWatchingStatus();
    // Leave politely if we can; a dropped socket is reconciled server-side on
    // disconnect anyway.
    publishTo(app(roomId, "presence/leave"), {});
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    releaseRealtime();
  };
}

function emitState(emit, event) {
  const state = normalizePlaybackState(event);
  if (state) emit(ROOM_EVENTS.STATE_UPDATE, state);
}

/**
 * Publish a host play/pause/seek. The position is stamped on the server's clock
 * so followers can subtract the whole delivery path, not just their own half.
 *
 * @returns true if it went out over the socket; false means the caller should
 *          fall back to the REST write path.
 */
export function publishPlaybackState(roomId, { mediaId, currentTimeSeconds, isPlaying }) {
  if (!isConnected()) return false;
  return publishTo(app(roomId, "state"), {
    mediaId: mediaId ?? null,
    currentTimeSeconds: currentTimeSeconds ?? 0,
    isPlaying: Boolean(isPlaying),
    positionAtServerMillis: serverNow(),
  });
}
