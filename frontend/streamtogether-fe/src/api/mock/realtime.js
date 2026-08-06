// Cross-tab realtime for the mock backend using BroadcastChannel.
// One channel per room. Falls back to a no-op (with a storage-event fallback)
// when BroadcastChannel is unavailable.

const HAS_BC = typeof BroadcastChannel !== "undefined";
const channelCache = new Map();

function channelName(roomId) {
  return `streamtogether.room.${roomId}`;
}

function getChannel(roomId) {
  if (!HAS_BC) return null;
  let ch = channelCache.get(roomId);
  if (!ch) {
    ch = new BroadcastChannel(channelName(roomId));
    channelCache.set(roomId, ch);
  }
  return ch;
}

// The event vocabulary is shared with the real STOMP channel — see
// ../realtime/events.js — so the Room page handles both the same way.
export { ROOM_EVENTS } from "../realtime/events";

/**
 * Broadcast an event to other tabs watching the same room.
 * Uses BroadcastChannel when available, otherwise a localStorage ping so the
 * `storage` event still reaches other tabs.
 */
export function broadcast(roomId, type, payload) {
  const message = { type, payload, at: Date.now(), source: tabId() };
  const ch = getChannel(roomId);
  if (ch) {
    ch.postMessage(message);
    return;
  }
  // Fallback: bump a localStorage key so other tabs get a `storage` event.
  try {
    localStorage.setItem(`streamtogether.rt.${roomId}`, JSON.stringify(message));
  } catch {
    /* ignore */
  }
}

/**
 * Subscribe to realtime events for a room.
 * Returns an unsubscribe function. `handler` receives ({ type, payload }).
 */
export function subscribe(roomId, handler) {
  const ch = getChannel(roomId);
  if (ch) {
    const listener = (event) => {
      if (event?.data?.source === tabId()) return; // ignore our own echoes
      handler(event.data);
    };
    ch.addEventListener("message", listener);
    return () => ch.removeEventListener("message", listener);
  }

  // Fallback path via storage events.
  const key = `streamtogether.rt.${roomId}`;
  const listener = (event) => {
    if (event.key !== key || !event.newValue) return;
    try {
      const data = JSON.parse(event.newValue);
      if (data?.source === tabId()) return;
      handler(data);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

// A per-tab id so we can ignore our own broadcasts.
let _tabId = null;
function tabId() {
  if (_tabId) return _tabId;
  _tabId = Math.random().toString(36).slice(2);
  return _tabId;
}
