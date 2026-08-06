// Media/stream domain API (stream-service registers as MEDIA-SERVICE).
// Gateway base: /media-service/rooms/{roomId}/{media,state}
import client from "./client";
import { USE_MOCK, getCurrentUserId } from "./config";
import { mockMedia } from "./mock/backend";

export const streamApi = {
  listMedia(roomId) {
    if (USE_MOCK) return mockMedia.list(roomId);
    return client
      .get(`/media-service/rooms/${encodeURIComponent(roomId)}/media`)
      .then((r) => r.data);
  },

  addMedia(roomId, { mediaUrl, mediaType }) {
    if (USE_MOCK) return mockMedia.add(roomId, { mediaUrl, mediaType }, getCurrentUserId());
    return client
      .post(`/media-service/rooms/${encodeURIComponent(roomId)}/media`, { mediaUrl, mediaType })
      .then((r) => r.data);
  },

  getState(roomId) {
    if (USE_MOCK) return mockMedia.getState(roomId);
    return client
      .get(`/media-service/rooms/${encodeURIComponent(roomId)}/state`)
      .then((r) => r.data);
  },

  setState(roomId, { mediaId, currentTimeSeconds, isPlaying }) {
    if (USE_MOCK) {
      return mockMedia.setState(
        roomId,
        { mediaId, currentTimeSeconds, isPlaying },
        getCurrentUserId(),
      );
    }
    return client
      .put(`/media-service/rooms/${encodeURIComponent(roomId)}/state`, {
        mediaId,
        currentTimeSeconds,
        isPlaying,
      })
      .then((r) => r.data);
  },
};

export default streamApi;
