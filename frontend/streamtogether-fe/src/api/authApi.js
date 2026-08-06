// Auth domain API. Gateway paths: /auth-service/auth/{register,login}
import client from "./client";
import { USE_MOCK } from "./config";
import { mockAuth } from "./mock/backend";

export const authApi = {
  register({ email, username, password }) {
    if (USE_MOCK) return mockAuth.register({ email, username, password });
    return client
      .post("/auth-service/auth/register", { email, username, password })
      .then((r) => r.data);
  },

  login({ usernameOrEmail, password }) {
    if (USE_MOCK) return mockAuth.login({ usernameOrEmail, password });
    return client
      .post("/auth-service/auth/login", { usernameOrEmail, password })
      .then((r) => r.data);
  },
};

export default authApi;
