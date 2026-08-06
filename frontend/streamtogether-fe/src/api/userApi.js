// User/profile domain API. Gateway base: /user-service/profiles/{userId}
import client from "./client";
import { USE_MOCK, getCurrentUserId } from "./config";
import { mockUsers } from "./mock/backend";

export const userApi = {
  getProfile(userId) {
    if (USE_MOCK) return mockUsers.getProfile(userId);
    return client
      .get(`/user-service/profiles/${encodeURIComponent(userId)}`)
      .then((r) => r.data);
  },

  updateProfile(userId, { displayName, avatarUrl }) {
    if (USE_MOCK) {
      return mockUsers.updateProfile(userId, { displayName, avatarUrl }, getCurrentUserId());
    }
    return client
      .put(`/user-service/profiles/${encodeURIComponent(userId)}`, { displayName, avatarUrl })
      .then((r) => r.data);
  },
};

export default userApi;
