// Axios instance used by the real-backend code path.
// - baseURL from VITE_API_BASE_URL (default http://localhost:8888)
// - request interceptor attaches Authorization: Bearer <token>
// - response interceptor clears auth + redirects to /login on 401
//
// The gateway routes /{service-id}/** to services, so domain modules call
// paths like `/room-service/rooms`.

import axios from "axios";
import { API_BASE_URL, TOKEN_KEY, clearAuth } from "./config";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      clearAuth();
      // Avoid redirect loops if we're already on an auth page.
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(normalizeAxiosError(error));
  },
);

/** Normalize an axios error into the shape the UI expects ({ status, message }). */
function normalizeAxiosError(error) {
  const status = error?.response?.status ?? 0;
  const data = error?.response?.data;
  const message =
    (data && (data.message || data.error)) ||
    error?.message ||
    "Something went wrong. Please try again.";
  const normalized = new Error(message);
  normalized.status = status;
  normalized.isApiError = true;
  normalized.data = data;
  return normalized;
}

export default client;
