// Chat domain API. Gateway base: /chat-service/rooms/{roomId}/messages
import client from "./client";
import { USE_MOCK, getCurrentUserId } from "./config";
import { mockChat } from "./mock/backend";

export const chatApi = {
  list(roomId) {
    if (USE_MOCK) return mockChat.list(roomId);
    return client
      .get(`/chat-service/rooms/${encodeURIComponent(roomId)}/messages`)
      .then((r) => r.data);
  },

  send(roomId, message) {
    if (USE_MOCK) return mockChat.send(roomId, { message }, getCurrentUserId());
    return client
      .post(`/chat-service/rooms/${encodeURIComponent(roomId)}/messages`, { message })
      .then((r) => r.data);
  },
};

export default chatApi;
