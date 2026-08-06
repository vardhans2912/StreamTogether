// The mock backend: implements the full domain contract against the
// localStorage-backed DB, with cross-tab realtime via BroadcastChannel.
//
// Every exported function returns a Promise (with a tiny artificial latency)
// so calling code is identical to the real axios-based implementation.

import { withDb, getDb, resetDb } from "./db";
import { broadcast, ROOM_EVENTS } from "./realtime";
import { uid, generateRoomCode, generateFakeJwt } from "../../lib/ids";
import { detectMediaType, mediaLabel } from "../../lib/media";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const latency = () => 120 + Math.floor(Math.random() * 180);

function delay(value, ms = latency()) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  error.isApiError = true;
  return Promise.reject(error);
}

function publicUser(user, profile) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: profile?.displayName || user.username,
    avatarUrl: profile?.avatarUrl || null,
  };
}

function findUser(db, userId) {
  return db.users.find((u) => u.id === userId) || null;
}
function findProfile(db, userId) {
  return db.profiles.find((p) => p.userId === userId) || null;
}
function roomByCode(db, code) {
  const c = String(code || "").toUpperCase();
  return db.rooms.find((r) => r.roomCode.toUpperCase() === c) || null;
}

function participantCount(db, roomId) {
  return db.participants.filter((p) => p.roomId === roomId).length;
}

/** Assemble the room shape the UI consumes. */
function roomView(db, room) {
  const host = findUser(db, room.hostUserId);
  const hostProfile = findProfile(db, room.hostUserId);
  return {
    id: room.id,
    roomCode: room.roomCode,
    roomName: room.roomName,
    hostUserId: room.hostUserId,
    host: publicUser(host, hostProfile),
    isActive: room.isActive,
    createdAt: room.createdAt,
    participantCount: participantCount(db, room.id),
  };
}

// ---------------------------------------------------------------------------
// Seed data (runs once). Provides a demo host + a couple of populated rooms
// so an empty install still looks alive.
// ---------------------------------------------------------------------------

function ensureSeed() {
  const db = getDb();
  if (db.users.length > 0) return;

  withDb((d) => {
    const demoId = uid("usr_");
    d.users.push({
      id: demoId,
      email: "demo@streamtogether.tv",
      username: "demo",
      password: "demo1234",
    });
    d.profiles.push({ userId: demoId, displayName: "Demo Host", avatarUrl: null });

    const friendId = uid("usr_");
    d.users.push({
      id: friendId,
      email: "ravi@streamtogether.tv",
      username: "ravi",
      password: "ravi1234",
    });
    d.profiles.push({ userId: friendId, displayName: "Ravi", avatarUrl: null });

    const now = Date.now();
    const room = {
      id: uid("room_"),
      roomCode: "MOVIE1",
      hostUserId: demoId,
      roomName: "Friday Night Movie",
      isActive: true,
      createdAt: now - 1000 * 60 * 30,
    };
    d.rooms.push(room);
    d.participants.push({ roomId: room.id, userId: demoId, joinedAt: room.createdAt });
    d.participants.push({ roomId: room.id, userId: friendId, joinedAt: now - 1000 * 60 * 12 });

    const media = {
      id: uid("media_"),
      roomId: room.id,
      addedByUserId: demoId,
      mediaType: "YOUTUBE",
      mediaUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      title: "Big Buck Bunny (trailer)",
      createdAt: now - 1000 * 60 * 20,
    };
    d.media.push(media);
    d.states.push({
      roomId: room.id,
      mediaId: media.id,
      currentTimeSeconds: 0,
      isPlaying: false,
      updatedAt: now - 1000 * 60 * 20,
    });

    d.messages.push({
      id: uid("msg_"),
      roomId: room.id,
      senderUserId: friendId,
      message: "hey! ready when you are 🍿",
      createdAt: now - 1000 * 60 * 10,
    });
    d.messages.push({
      id: uid("msg_"),
      roomId: room.id,
      senderUserId: demoId,
      message: "queuing something up now",
      createdAt: now - 1000 * 60 * 9,
    });
  });
}

ensureSeed();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const mockAuth = {
  register({ email, username, password }) {
    email = String(email || "").trim().toLowerCase();
    username = String(username || "").trim();
    if (!email || !username || !password) {
      return fail(400, "Email, username and password are required.");
    }
    const db = getDb();
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return fail(409, "An account with that email already exists.");
    }
    if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return fail(409, "That username is taken.");
    }

    const created = withDb((d) => {
      const userId = uid("usr_");
      const user = { id: userId, email, username, password };
      d.users.push(user);
      d.profiles.push({ userId, displayName: username, avatarUrl: null });
      return user;
    });

    const token = generateFakeJwt({ sub: created.id, username: created.username });
    return delay({ token, user: publicUser(created, { displayName: username }) });
  },

  login({ usernameOrEmail, password }) {
    const key = String(usernameOrEmail || "").trim().toLowerCase();
    if (!key || !password) {
      return fail(400, "Please enter your credentials.");
    }
    const db = getDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === key || u.username.toLowerCase() === key,
    );
    if (!user || user.password !== password) {
      return fail(401, "Invalid username/email or password.");
    }
    const token = generateFakeJwt({ sub: user.id, username: user.username });
    return delay({ token, user: publicUser(user, findProfile(db, user.id)) });
  },
};

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export const mockRooms = {
  create({ roomName }, currentUserId) {
    if (!currentUserId) return fail(401, "You must be signed in.");
    const name = String(roomName || "").trim();
    if (!name) return fail(400, "Room name is required.");

    const created = withDb((d) => {
      let code = generateRoomCode();
      while (d.rooms.some((r) => r.roomCode === code)) code = generateRoomCode();
      const room = {
        id: uid("room_"),
        roomCode: code,
        hostUserId: currentUserId,
        roomName: name,
        isActive: true,
        createdAt: Date.now(),
      };
      d.rooms.push(room);
      d.participants.push({ roomId: room.id, userId: currentUserId, joinedAt: Date.now() });
      d.states.push({
        roomId: room.id,
        mediaId: null,
        currentTimeSeconds: 0,
        isPlaying: false,
        updatedAt: Date.now(),
      });
      return room;
    });

    return delay(roomView(getDb(), created));
  },

  list(currentUserId) {
    if (!currentUserId) return fail(401, "You must be signed in.");
    const db = getDb();
    const roomIds = new Set(
      db.participants.filter((p) => p.userId === currentUserId).map((p) => p.roomId),
    );
    // include rooms hosted by the user even if participant row is missing
    db.rooms.filter((r) => r.hostUserId === currentUserId).forEach((r) => roomIds.add(r.id));

    const rooms = db.rooms
      .filter((r) => roomIds.has(r.id))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => roomView(db, r));
    return delay(rooms);
  },

  get(code) {
    const db = getDb();
    const room = roomByCode(db, code);
    if (!room) return fail(404, "Room not found.");
    return delay(roomView(db, room));
  },

  join(code, currentUserId) {
    if (!currentUserId) return fail(401, "You must be signed in.");
    const db = getDb();
    const room = roomByCode(db, code);
    if (!room) return fail(404, "No room with that code.");
    if (!room.isActive) return fail(410, "This room has ended.");

    withDb((d) => {
      const exists = d.participants.some(
        (p) => p.roomId === room.id && p.userId === currentUserId,
      );
      if (!exists) {
        d.participants.push({ roomId: room.id, userId: currentUserId, joinedAt: Date.now() });
      }
    });

    const joinedUser = publicUser(findUser(db, currentUserId), findProfile(db, currentUserId));
    broadcast(room.id, ROOM_EVENTS.PARTICIPANT_JOINED, { user: joinedUser });
    return delay(roomView(getDb(), room));
  },

  participants(code) {
    const db = getDb();
    const room = roomByCode(db, code);
    if (!room) return fail(404, "Room not found.");
    const list = db.participants
      .filter((p) => p.roomId === room.id)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => {
        const user = publicUser(findUser(db, p.userId), findProfile(db, p.userId));
        return { ...user, joinedAt: p.joinedAt, isHost: p.userId === room.hostUserId };
      })
      .filter((p) => p.id);
    return delay(list);
  },

  end(code, currentUserId) {
    if (!currentUserId) return fail(401, "You must be signed in.");
    const db = getDb();
    const room = roomByCode(db, code);
    if (!room) return fail(404, "Room not found.");
    if (room.hostUserId !== currentUserId) {
      return fail(403, "Only the host can end this room.");
    }
    withDb((d) => {
      const target = d.rooms.find((r) => r.id === room.id);
      if (target) target.isActive = false;
    });
    broadcast(room.id, ROOM_EVENTS.ROOM_ENDED, { roomCode: room.roomCode });
    return delay({ success: true });
  },
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const mockChat = {
  list(roomId) {
    const db = getDb();
    const messages = db.messages
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((m) => decorateMessage(db, m));
    return delay(messages, 80);
  },

  send(roomId, { message }, currentUserId) {
    if (!currentUserId) return fail(401, "You must be signed in.");
    const text = String(message || "").trim();
    if (!text) return fail(400, "Message cannot be empty.");

    const created = withDb((d) => {
      const row = {
        id: uid("msg_"),
        roomId,
        senderUserId: currentUserId,
        message: text,
        createdAt: Date.now(),
      };
      d.messages.push(row);
      return row;
    });

    const decorated = decorateMessage(getDb(), created);
    broadcast(roomId, ROOM_EVENTS.CHAT_MESSAGE, decorated);
    return delay(decorated, 60);
  },
};

function decorateMessage(db, m) {
  const user = publicUser(findUser(db, m.senderUserId), findProfile(db, m.senderUserId));
  return {
    id: m.id,
    roomId: m.roomId,
    senderUserId: m.senderUserId,
    senderName: user?.displayName || "Unknown",
    senderUsername: user?.username || "unknown",
    message: m.message,
    createdAt: m.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Media (stream-service, registered as MEDIA-SERVICE)
// ---------------------------------------------------------------------------

export const mockMedia = {
  list(roomId) {
    const db = getDb();
    const items = db.media
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => a.createdAt - b.createdAt);
    return delay(items, 80);
  },

  add(roomId, { mediaUrl, mediaType }, currentUserId) {
    if (!currentUserId) return fail(401, "You must be signed in.");
    const url = String(mediaUrl || "").trim();
    if (!url) return fail(400, "A media URL is required.");
    const type = mediaType || detectMediaType(url);

    const created = withDb((d) => {
      const row = {
        id: uid("media_"),
        roomId,
        addedByUserId: currentUserId,
        mediaType: type,
        mediaUrl: url,
        title: mediaLabel({ mediaType: type, mediaUrl: url }),
        createdAt: Date.now(),
      };
      d.media.push(row);
      // If the room has no active media yet, make this the current one.
      const state = d.states.find((s) => s.roomId === roomId);
      if (state && !state.mediaId) {
        state.mediaId = row.id;
        state.currentTimeSeconds = 0;
        state.isPlaying = false;
        state.updatedAt = Date.now();
      }
      return row;
    });

    broadcast(roomId, ROOM_EVENTS.MEDIA_ADDED, created);
    const state = getDb().states.find((s) => s.roomId === roomId) || null;
    if (state) broadcast(roomId, ROOM_EVENTS.STATE_UPDATE, state);
    return delay(created);
  },

  getState(roomId) {
    const db = getDb();
    let state = db.states.find((s) => s.roomId === roomId);
    if (!state) {
      state = {
        roomId,
        mediaId: null,
        currentTimeSeconds: 0,
        isPlaying: false,
        updatedAt: Date.now(),
      };
    }
    return delay(state, 60);
  },

  setState(roomId, { mediaId, currentTimeSeconds, isPlaying }, currentUserId) {
    if (!currentUserId) return fail(401, "You must be signed in.");
    const updated = withDb((d) => {
      let state = d.states.find((s) => s.roomId === roomId);
      if (!state) {
        state = { roomId };
        d.states.push(state);
      }
      if (mediaId !== undefined) state.mediaId = mediaId;
      if (currentTimeSeconds !== undefined) {
        state.currentTimeSeconds = Math.max(0, Number(currentTimeSeconds) || 0);
      }
      if (isPlaying !== undefined) state.isPlaying = Boolean(isPlaying);
      state.updatedAt = Date.now();
      return { ...state };
    });

    broadcast(roomId, ROOM_EVENTS.STATE_UPDATE, updated);
    return delay(updated, 40);
  },
};

// ---------------------------------------------------------------------------
// Users / profiles
// ---------------------------------------------------------------------------

export const mockUsers = {
  getProfile(userId) {
    const db = getDb();
    const user = findUser(db, userId);
    if (!user) return fail(404, "User not found.");
    return delay(publicUser(user, findProfile(db, userId)));
  },

  updateProfile(userId, { displayName, avatarUrl }, currentUserId) {
    if (!currentUserId) return fail(401, "You must be signed in.");
    if (currentUserId !== userId) return fail(403, "You can only edit your own profile.");
    const db = getDb();
    if (!findUser(db, userId)) return fail(404, "User not found.");

    withDb((d) => {
      let profile = d.profiles.find((p) => p.userId === userId);
      if (!profile) {
        profile = { userId, displayName: null, avatarUrl: null };
        d.profiles.push(profile);
      }
      if (displayName !== undefined) profile.displayName = displayName;
      if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl;
    });

    const fresh = getDb();
    return delay(publicUser(findUser(fresh, userId), findProfile(fresh, userId)));
  },
};

export { resetDb };
