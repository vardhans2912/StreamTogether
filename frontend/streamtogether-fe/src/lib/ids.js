// Small id / code generators used by the mock backend and UI.

/** Cryptographically-random-ish unique id (good enough for a demo/mock). */
export function uid(prefix = "") {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rand}`;
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/O/1/I

/** Generate a short, human-friendly room code (6 uppercase alphanumerics). */
export function generateRoomCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Generate an opaque, JWT-looking token. Not a real JWT and not verified —
 * the mock backend just needs a stable opaque string per session.
 */
export function generateFakeJwt(payload = {}) {
  const b64 = (obj) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ ...payload, iat: Date.now(), mock: true });
  const signature = uid();
  return `${header}.${body}.${signature}`;
}
