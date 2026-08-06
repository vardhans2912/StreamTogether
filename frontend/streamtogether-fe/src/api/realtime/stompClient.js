// One STOMP-over-WebSocket connection for the whole app, held against
// stream-service (the realtime hub). Playback, chat and presence all ride it.
//
// Responsibilities kept here because they are connection-level, not room-level:
//  - a single socket, shared and reference-counted by callers,
//  - a fresh JWT on every (re)connect,
//  - subscriptions that survive a reconnect,
//  - an estimate of the offset between this browser's clock and the server's,
//    so playback positions can be exchanged on one agreed clock.

import { Client } from "@stomp/stompjs";
import { WS_URL, TOKEN_KEY } from "../config";

export const STATUS = {
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  UNAUTHORIZED: "unauthorized",
};

// Give up re-handshaking after this many consecutive broker-level errors; a
// rejected token will not start working on the next attempt, and callers fall
// back to polling.
const MAX_STOMP_ERRORS = 3;

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30000;

let client = null;
let status = STATUS.IDLE;
let refCount = 0;
let consecutiveErrors = 0;

const statusListeners = new Set();
/** key -> { destination, callback, stompSubscription } */
const subscriptions = new Map();
let subscriptionSeq = 0;

let clockOffsetMillis = 0;
let bestRoundTripMillis = Infinity;

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

function setStatus(next) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => {
    try {
      listener(next);
    } catch {
      /* a bad listener must not break the others */
    }
  });
}

export function getStatus() {
  return status;
}

export function isConnected() {
  return status === STATUS.CONNECTED && Boolean(client?.connected);
}

/** Subscribe to connection-status changes. Returns an unsubscribe function. */
export function onStatusChange(listener) {
  statusListeners.add(listener);
  listener(status);
  return () => statusListeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Clock alignment
// ---------------------------------------------------------------------------

/** This browser's best guess at the server's clock, in epoch millis. */
export function serverNow() {
  return Date.now() + clockOffsetMillis;
}

export function getClockOffset() {
  return clockOffsetMillis;
}

/**
 * NTP-style handshake: the reply carries our send time and the server's clock,
 * so offset = serverTime - (sent + roundTrip / 2). Samples are noisy, so keep
 * the one that made the fastest round trip.
 */
function startClockSync() {
  bestRoundTripMillis = Infinity;

  const unsubscribe = rawSubscribe("/user/queue/time", (frame) => {
    const { clientSentAtMillis, serverTimeMillis } = parseBody(frame);
    if (!clientSentAtMillis || !serverTimeMillis) return;

    const roundTrip = Date.now() - clientSentAtMillis;
    if (roundTrip < bestRoundTripMillis) {
      bestRoundTripMillis = roundTrip;
      clockOffsetMillis = serverTimeMillis - (clientSentAtMillis + roundTrip / 2);
    }
  });

  const timers = [0, 400, 1200].map((delay) =>
    setTimeout(() => {
      publishTo("/app/time", { clientSentAtMillis: Date.now() });
    }, delay),
  );

  // Stop listening once the samples are in; the offset is kept.
  const cleanup = setTimeout(unsubscribe, 4000);
  return () => {
    timers.forEach(clearTimeout);
    clearTimeout(cleanup);
    unsubscribe();
  };
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

function createClient() {
  const instance = new Client({
    brokerURL: WS_URL,
    reconnectDelay: RECONNECT_DELAY_MS,
    maxReconnectDelay: MAX_RECONNECT_DELAY_MS,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });

  // Re-read the token on every attempt: it may have been refreshed, or cleared
  // by a 401 on the REST side, since the last one.
  instance.beforeConnect = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    instance.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    setStatus(STATUS.CONNECTING);
  };

  instance.onConnect = () => {
    consecutiveErrors = 0;
    // Re-establish everything the app asked for while we were down.
    subscriptions.forEach((entry) => attach(entry));
    setStatus(STATUS.CONNECTED);
    startClockSync();
  };

  instance.onWebSocketClose = () => {
    subscriptions.forEach((entry) => {
      entry.stompSubscription = null;
    });
    if (status !== STATUS.UNAUTHORIZED) setStatus(STATUS.DISCONNECTED);
  };

  // A broker-level ERROR frame; the server closes the socket right after.
  instance.onStompError = (frame) => {
    consecutiveErrors += 1;
    if (consecutiveErrors >= MAX_STOMP_ERRORS) {
      setStatus(STATUS.UNAUTHORIZED);
      instance.deactivate();
      return;
    }
    if (import.meta.env.DEV) {
      console.warn("[realtime] broker error:", frame?.headers?.message);
    }
  };

  return instance;
}

/**
 * Open the shared connection (idempotent). Callers must pair this with
 * {@link releaseRealtime} so the socket closes when the last room page unmounts.
 */
export function acquireRealtime() {
  refCount += 1;
  if (!client) client = createClient();
  if (!client.active) {
    consecutiveErrors = 0;
    if (status === STATUS.UNAUTHORIZED) setStatus(STATUS.IDLE);
    client.activate();
  }
  return client;
}

export function releaseRealtime() {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0 || !client) return;
  const closing = client;
  client = null;
  subscriptions.clear();
  setStatus(STATUS.IDLE);
  closing.deactivate().catch(() => {
    /* already gone */
  });
}

// ---------------------------------------------------------------------------
// Subscriptions and publishing
// ---------------------------------------------------------------------------

function attach(entry) {
  if (!client?.connected || entry.stompSubscription) return;
  try {
    entry.stompSubscription = client.subscribe(entry.destination, entry.callback);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[realtime] could not subscribe to ${entry.destination}`, err);
    }
  }
}

/**
 * Subscribe to a destination, now or as soon as the socket is up, and again
 * after any reconnect. Returns an unsubscribe function.
 */
export function rawSubscribe(destination, callback) {
  const key = `sub-${(subscriptionSeq += 1)}`;
  const entry = { destination, callback, stompSubscription: null };
  subscriptions.set(key, entry);
  attach(entry);

  return () => {
    subscriptions.delete(key);
    try {
      entry.stompSubscription?.unsubscribe();
    } catch {
      /* the socket went away first */
    }
    entry.stompSubscription = null;
  };
}

/** Publish JSON to a destination. Returns false if the socket isn't up. */
export function publishTo(destination, body) {
  if (!client?.connected) return false;
  try {
    client.publish({ destination, body: JSON.stringify(body ?? {}) });
    return true;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[realtime] could not publish to ${destination}`, err);
    }
    return false;
  }
}

/** STOMP bodies are strings; every payload in this app is JSON. */
export function parseBody(frame) {
  try {
    return frame?.body ? JSON.parse(frame.body) : null;
  } catch {
    return null;
  }
}
