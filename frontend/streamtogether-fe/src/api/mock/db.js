// localStorage-backed persistence for the mock backend.
// A single JSON blob holds every collection so reloads keep full state.

const STORAGE_KEY = "streamtogether.mockdb.v1";

const EMPTY_DB = {
  users: [], // { id, email, username, password }
  profiles: [], // { userId, displayName, avatarUrl }
  rooms: [], // { id, roomCode, hostUserId, roomName, isActive, createdAt }
  participants: [], // { roomId, userId, joinedAt }
  messages: [], // { id, roomId, senderUserId, message, createdAt }
  media: [], // { id, roomId, addedByUserId, mediaType, mediaUrl, title, createdAt }
  states: [], // { roomId, mediaId, currentTimeSeconds, isPlaying, updatedAt }
};

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredCloneSafe(EMPTY_DB);
    const parsed = JSON.parse(raw);
    // Merge to tolerate schema additions across versions.
    return { ...structuredCloneSafe(EMPTY_DB), ...parsed };
  } catch {
    return structuredCloneSafe(EMPTY_DB);
  }
}

function writeRaw(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // storage might be full / unavailable — ignore for a demo mock.
  }
}

function structuredCloneSafe(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Read the DB, mutate it in the callback, and persist.
 * Returns whatever the callback returns.
 */
export function withDb(mutator) {
  const db = readRaw();
  const result = mutator(db);
  writeRaw(db);
  return result;
}

/** Read-only snapshot of the DB. */
export function getDb() {
  return readRaw();
}

/** Wipe all mock data (used by dev tools / reset button). */
export function resetDb() {
  writeRaw(structuredCloneSafe(EMPTY_DB));
}

export { STORAGE_KEY };
