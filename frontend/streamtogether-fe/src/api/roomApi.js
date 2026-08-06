// Room domain API. Gateway base: /room-service/rooms
import client from "./client";
import { USE_MOCK, getCurrentUserId } from "./config";
import { mockRooms } from "./mock/backend";

export const roomApi = {
  create({ roomName }) {
    if (USE_MOCK) return mockRooms.create({ roomName }, getCurrentUserId());
    return client.post("/room-service/rooms", { roomName }).then((r) => r.data);
  },

  list() {
    if (USE_MOCK) return mockRooms.list(getCurrentUserId());
    return client.get("/room-service/rooms").then((r) => r.data);
  },

  get(code) {
    if (USE_MOCK) return mockRooms.get(code);
    return client.get(`/room-service/rooms/${encodeURIComponent(code)}`).then((r) => r.data);
  },

  join(code) {
    if (USE_MOCK) return mockRooms.join(code, getCurrentUserId());
    return client
      .post(`/room-service/rooms/${encodeURIComponent(code)}/join`)
      .then((r) => r.data);
  },

  participants(code) {
    if (USE_MOCK) return mockRooms.participants(code);
    return client
      .get(`/room-service/rooms/${encodeURIComponent(code)}/participants`)
      .then((r) => r.data);
  },

  end(code) {
    if (USE_MOCK) return mockRooms.end(code, getCurrentUserId());
    return client
      .delete(`/room-service/rooms/${encodeURIComponent(code)}`)
      .then((r) => r.data);
  },
};

export default roomApi;
