// Realtime event names shared by both delivery mechanisms: the STOMP room
// channel against the real backend, and BroadcastChannel in mock mode. Keeping
// one vocabulary means the Room page doesn't care which one is feeding it.

export const ROOM_EVENTS = {
  CHAT_MESSAGE: "chat:message",
  STATE_UPDATE: "state:update",
  MEDIA_ADDED: "media:added",
  PARTICIPANT_JOINED: "participant:joined",
  ROOM_ENDED: "room:ended",
  // Push-only: who is connected right now, and server-side rejections
  // (e.g. a non-host trying to drive playback). Mock mode never emits these.
  PRESENCE_UPDATE: "presence:update",
  REALTIME_ERROR: "realtime:error",
};

export default ROOM_EVENTS;
